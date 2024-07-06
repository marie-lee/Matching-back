module.exports = (sequelize, DataTypes) => {
  const TB_USER_EMAIL = sequelize.define('TB_USER_EMAIL', {
    EMAIL_SN: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    USER_EMAIL: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    VERIFICATION_CODE: {
      type: DataTypes.STRING(6),
      allowNull: false
    },
    VERIFIED: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    CREATED_DT: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    UPDATED_DT: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'TB_USER_EMAIL',
    timestamps: true,
    createdAt: 'CREATED_DT',
    updatedAt: 'UPDATED_DT'
  });

  return TB_USER_EMAIL;
};
