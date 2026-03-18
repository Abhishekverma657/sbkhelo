import jwt  from 'jsonwebtoken';
const SECRET_KEY = "Pawan_Saini"; // Same as above

const verifySubadmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer token"

    if (!token) {
        return res.status(401).json({ status: 0, message: 'Token missing' });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);

        if (decoded.role !== 'subadmin') {
            return res.status(403).json({ status: 0, message: 'Access denied: not a subadmin' });
        }

        // Attach user info to request
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ status: 0, message: 'Invalid or expired token' });
    }
};

export default verifySubadmin;