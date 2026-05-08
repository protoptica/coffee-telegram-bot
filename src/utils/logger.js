function withTimestamp(payload) {
  return {
    ts: new Date().toISOString(),
    ...payload,
  };
}

function normalizeContext(context = {}) {
  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== undefined)
  );
}

export function logInfo(event, context = {}) {
  console.log(
    JSON.stringify(
      withTimestamp({
        level: "info",
        event,
        ...normalizeContext(context),
      })
    )
  );
}

export function logError(event, error, context = {}) {
  const normalizedError =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: error.code,
        }
      : {
          message: String(error),
        };

  console.error(
    JSON.stringify(
      withTimestamp({
        level: "error",
        event,
        ...normalizeContext(context),
        error: normalizedError,
      })
    )
  );
}
