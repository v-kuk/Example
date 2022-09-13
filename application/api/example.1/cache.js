({
  access: 'public',
  method: async (data) => {
    const isInCacheQueue = await db.redis.client.sIsMember('cache', data);
    const isInCache = await db.redis.client.hExists('data', data);

    if (isInCacheQueue) {
      return await new Promise(async (resolve) => {
        const isDataUpdated = () => new Promise((uResolve) => {
          const intervalId = setInterval(async () => {
            const isInCacheQueue = await db.redis.client.sIsMember('cache', data);
            if (!isInCacheQueue) {
              clearInterval(intervalId);
              uResolve();
            }
          }, 100);
        });

        await isDataUpdated();

        const result = await db.redis.client.hGet('data', data);
        resolve(result);
      });
    } else if (isInCache) {
      return await db.redis.client.hGet('data', data);
    } else {
      await db.redis.client.sAdd('cache', data);
      const resultData = () => new Promise((resolve) => {
        setTimeout(() => {
          resolve(db.pg.query('SELECT * from tickers."TickersV2"'));
        }, 5000);
      });
      const {rows: result} = await resultData();
      await db.redis.client.hSet('data', data, JSON.stringify(result));
      db.redis.client.sRem('cache', data);
      console.log(data, result);
      return result;
    }
  },
});
