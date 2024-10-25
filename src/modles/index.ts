// src/models/index.ts
import type { D1Orm } from "d1-orm";
import { DataTypes, Model } from "d1-orm";

export const UserModel = (orm: D1Orm) => {
  return new Model(
    {
      D1Orm: orm,
      tableName: "User",
      primaryKeys: "id",
    },
    {
      id: {
        type: DataTypes.TEXT,
        notNull: true,
      },
      did: {
        type: DataTypes.TEXT,
        notNull: true,
      },
      handle: {
        type: DataTypes.TEXT,
      },
      createdAt: {
        type: DataTypes.TEXT,
        notNull: true,
      },
      updatedAt: {
        type: DataTypes.TEXT,
        notNull: true,
      },
    },
  );
};
