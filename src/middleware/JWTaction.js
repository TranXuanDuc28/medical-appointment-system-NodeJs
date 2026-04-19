import jwt from 'jsonwebtoken';
require('dotenv').config();

const createJWT = (payload) => {
    try {
        const token = jwt.sign(payload, process.env.JWT_SECRET, { 
            expiresIn: process.env.JWT_EXPIRES_IN 
        });
        return token;
    } catch (error) {
        console.log(error);
        return null;
    }
}

const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded;
    } catch (err) {
        console.log(err);
        return null;
    }
}

const extractToken = (req) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    return token;
}

const checkAuthenticationUser = (req, res, next) => {
    if (req.method === 'OPTIONS') {
        return next();
    }
    const nonSecurePaths = [
        '/api/register', '/api/login', '/api/logout', '/api/allcode',
        '/api/top-doctor-home', '/api/get_all_doctor', '/api/get_detail_doctor_by_id',
        '/api/get-profile-doctor-by-id', '/api/get-handbook', '/api/get-detail-handbook-by-id',
        '/api/get-related-handbooks', '/api/get-specialty', '/api/get-detail-specialty-by-id',
        '/api/get-clinic', '/api/get-detail-clinic-by-id', '/api/get-extra-doctor-by-id',
        '/api/get_schedule_doctor_by_date', '/api/packages/all', '/api/packages/featured',
        '/api/packages/filter-options', '/api/packages/search', '/api/casso/webhook',
        '/api/login-patient-chat', '/api/patient-book-appointment', '/api/verify-book-appointment'
    ];
    // Regex check for parameterized public paths
    const isPublic = nonSecurePaths.some(path => {
        const pattern = "^" + path.replace(":id", "[^/]+") + "$";
        const regex = new RegExp(pattern);
        return regex.test(req.path);
    }) || req.path.startsWith('/api/packages/') || req.path.startsWith('/api/facilities/');

    if (isPublic) return next();

    const cookies = req.cookies;
    const tokenFromHeader = extractToken(req);

    if ((cookies && cookies.jwt) || tokenFromHeader) {
        const token = cookies && cookies.jwt ? cookies.jwt : tokenFromHeader;
        const decoded = verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                errCode: -1,
                errMessage: 'Not authenticated user'
            });
        }
        req.user = decoded;
        req.accessToken = token;
        next();
    } else {
        return res.status(401).json({
            errCode: -1,
            errMessage: 'Not authenticated user'
        });
    }
}

const checkUserPermission = (req, res, next) => {
    if (req.method === 'OPTIONS') {
        return next();
    }
    const nonSecurePaths = [
        '/api/register', '/api/login', '/api/logout', '/api/allcode',
        '/api/top-doctor-home', '/api/get_all_doctor', '/api/get_detail_doctor_by_id',
        '/api/get-profile-doctor-by-id', '/api/get-handbook', '/api/get-detail-handbook-by-id',
        '/api/get-related-handbooks', '/api/get-specialty', '/api/get-detail-specialty-by-id',
        '/api/get-clinic', '/api/get-detail-clinic-by-id', '/api/get-extra-doctor-by-id',
        '/api/get_schedule_doctor_by_date', '/api/packages/all', '/api/packages/featured',
        '/api/packages/filter-options', '/api/packages/search', '/api/casso/webhook',
        '/api/login-patient-chat', '/api/patient-book-appointment', '/api/verify-book-appointment'
    ];
    // Regex check for parameterized public paths
    const isPublic = nonSecurePaths.some(path => {
        const pattern = "^" + path.replace(":id", "[^/]+") + "$";
        const regex = new RegExp(pattern);
        return regex.test(req.path);
    }) || req.path.startsWith('/api/packages/') || req.path.startsWith('/api/facilities/');

    if (isPublic) return next();

    if (req.user) {
        const email = req.user.email;
        const roles = req.user.roles;
        const currentUrl = req.path;

        if (!roles || roles.length === 0) {
            return res.status(403).json({
                errCode: -1,
                errMessage: "You don't have permission to access this resource..."
            });
        }

        const canAccess = roles.some(role => {
            const pattern = "^" + role.url.replace(":id", "[^/]+") + "$";
            const regex = new RegExp(pattern);
            return regex.test(currentUrl);
        });

        if (canAccess) {
            next();
        } else {
            return res.status(403).json({
                errCode: -1,
                errMessage: "You don't have permission to access this resource..."
            });
        }
    } else {
        return res.status(401).json({
            errCode: -1,
            errMessage: 'Not authenticated user'
        });
    }
};

module.exports = {
    createJWT,
    verifyToken,
    checkAuthenticationUser,
    checkUserPermission
};
