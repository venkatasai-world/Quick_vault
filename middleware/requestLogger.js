export const requestLogger = (req, res, next) => {
    if (req.path.startsWith('/retrieve') || req.path.startsWith('/check-code')) {
        console.log(`${req.method} ${req.path}`, req.body, req.params);
    }
    next();
};
