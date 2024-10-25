// Adapted from https://www.npmjs.com/package/@atproto/identity
// To not use node.js dns/promises

const SUBDOMAIN = '_atproto';
const PREFIX = 'did=';

export interface HandleResolverOpts {
  timeout?: number;
  backupNameservers?: string[];
}

// Define an interface for the DNS response structure
interface DnsResponse {
  Answer?: Array<{ type: number; data: string }>;
}

export class HandleResolver {
  timeout: number;
  backupNameservers: string[];

  /**
   * Construct a HandleResolver with options
   *
   * @param {object} [opts] - options to pass to the constructor
   * @param {number} [opts.timeout=3000] - timeout in milliseconds
   * @param {string[]} [opts.backupNameservers] - backup nameservers to use if the system ones are not available
   */
  constructor(opts: HandleResolverOpts = {}) {
    this.timeout = opts.timeout ?? 3000;
    this.backupNameservers = opts.backupNameservers ?? [];
  }

  async resolve(handle: string): Promise<string | undefined> {
    const dnsPromise = this.resolveDnsViaHttp(handle);
    const httpAbort = new AbortController();
    const httpPromise = this.resolveHttp(handle, httpAbort.signal).catch(
      () => undefined,
    );

    // Try DNS first
    const dnsRes = await dnsPromise;
    if (dnsRes) {
      httpAbort.abort();
      return dnsRes;
    }

    // Fallback to HTTP if DNS fails
    const res = await httpPromise;
    if (res) {
      return res;
    }

    // Try the backup DNS if both primary methods fail
    return this.resolveDnsBackup(handle);
  }

  private async resolveDnsViaHttp(handle: string): Promise<string | undefined> {
    const url = `https://dns.google/resolve?name=${SUBDOMAIN}.${handle}&type=TXT`;
    try {
      const res = await fetch(url, { method: 'GET', signal: this.getTimeoutSignal() });
      const json = (await res.json()) as DnsResponse;

      if (json.Answer) {
        const dnsRecords = json.Answer
          .filter((answer) => answer.type === 16)
          .map((answer) => answer.data.replace(/"/g, ''));

        return this.parseDnsResult(dnsRecords);
      }
    } catch (error) {
      console.error("DNS over HTTPS resolution failed:", error);
    }
    return undefined;
  }

  private async resolveHttp(handle: string, signal?: AbortSignal): Promise<string | undefined> {
    const url = new URL('/.well-known/atproto-did', `https://${handle}`);
    try {
      const res = await fetch(url.toString(), { signal });
      const did = (await res.text()).split('\n')[0].trim();
      if (did.startsWith('did:')) {
        return did;
      }
    } catch (error) {
      console.error("HTTP resolution failed:", error);
    }
    return undefined;
  }

  private async resolveDnsBackup(handle: string): Promise<string | undefined> {
    for (const nameserver of this.backupNameservers) {
      try {
        const url = `https://${nameserver}/resolve?name=${SUBDOMAIN}.${handle}&type=TXT`;
        const res = await fetch(url, { method: 'GET', signal: this.getTimeoutSignal() });
        const json = (await res.json()) as DnsResponse;

        if (json.Answer) {
          const dnsRecords = json.Answer
            .filter((answer) => answer.type === 16)
            .map((answer) => answer.data.replace(/"/g, ''));

          return this.parseDnsResult(dnsRecords);
        }
      } catch (error) {
        console.error(`Backup DNS resolution failed for ${nameserver}:`, error);
      }
    }
    return undefined;
  }

  private parseDnsResult(dnsRecords: string[]): string | undefined {
    const foundRecords = dnsRecords.filter(record => record.startsWith(PREFIX));
    if (foundRecords.length === 1) {
      return foundRecords[0].slice(PREFIX.length);
    }
    return undefined;
  }

  private getTimeoutSignal(): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), this.timeout);
    return controller.signal;
  }
}

// Export the resolver for use in other parts of the project
export default HandleResolver;
