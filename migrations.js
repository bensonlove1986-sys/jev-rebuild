// Cloudflare Worker 迁移配置文件
// 用于删除旧的Durable Objects

/** @type {import('@cloudflare/workers-types').MigrationManifest} */
const migrations = [
  {
    version: 1,
    async migrate(migrate, env) {
      // 删除Counter类的所有Durable Objects
      await migrate.deleteClass('Counter');
      
      // 删除SessionStore类的所有Durable Objects
      await migrate.deleteClass('SessionStore');
    },
  },
];

export default migrations;