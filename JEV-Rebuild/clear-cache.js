// 清空所有历史缓存
console.log('开始清空缓存...');

// 清空 localStorage
localStorage.clear();
console.log('localStorage 已清空');

// 清空 sessionStorage
sessionStorage.clear();
console.log('sessionStorage 已清空');

// 清空 indexedDB
indexedDB.databases().then(dbs => {
  dbs.forEach(db => {
    indexedDB.deleteDatabase(db.name);
    console.log(`IndexedDB 数据库 ${db.name} 已删除`);
  });
  console.log('所有缓存已清空');
});
