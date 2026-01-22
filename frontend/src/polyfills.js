// Polyfills for older browsers

// Promise.allSettled polyfill
if (!Promise.allSettled) {
  Promise.allSettled = function(promises) {
    return Promise.all(
      promises.map(promise =>
        Promise.resolve(promise)
          .then(value => ({
            status: 'fulfilled',
            value: value
          }))
          .catch(reason => ({
            status: 'rejected',
            reason: reason
          }))
      )
    );
  };
}

// Promise.any polyfill (if needed)
if (!Promise.any) {
  Promise.any = function(promises) {
    return new Promise((resolve, reject) => {
      const errors = [];
      let rejectedCount = 0;
      
      promises.forEach((promise, index) => {
        Promise.resolve(promise)
          .then(resolve)
          .catch(error => {
            errors[index] = error;
            rejectedCount++;
            if (rejectedCount === promises.length) {
              reject(new AggregateError(errors, 'All promises were rejected'));
            }
          });
      });
    });
  };
}

// Object.fromEntries polyfill (if needed)
if (!Object.fromEntries) {
  Object.fromEntries = function(entries) {
    const obj = {};
    for (const [key, value] of entries) {
      obj[key] = value;
    }
    return obj;
  };
}

// String.prototype.replaceAll polyfill
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function(search, replacement) {
    return this.split(search).join(replacement);
  };
}
