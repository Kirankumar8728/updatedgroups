export const getSafeCwd = () => (typeof process !== 'undefined' && typeof process.cwd === 'function') ? process.cwd() : '/tmp';
