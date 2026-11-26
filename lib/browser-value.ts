/** Subscribe function for useSyncExternalStore values that are read once from the browser and never change. */
export const subscribeNever = () => () => {};
