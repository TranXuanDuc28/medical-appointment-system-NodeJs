const jwt = require('jsonwebtoken');
require('dotenv').config();

const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_healthcare_2026';
const expiresIn = process.env.JWT_EXPIRES_IN || '1d';

const createJWT = (payload) => {
    try {
        const token = jwt.sign(payload, secret, { 
            expiresIn: expiresIn 
        });
        return token;
    } catch (error) {
        console.log(error);
        return null;
    }
}

const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, secret);
        return decoded;
    } catch (err) {
        console.log(err);
        return null;
    }
}

const createRefreshToken = (payload) => {
    try {
        const token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'default_refresh_secret', { 
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' 
        });
        return token;
    } catch (error) {
        console.log(error);
        return null;
    }
}

const verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'default_refresh_secret');
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
        '/api/login-patient-chat', '/api/patient-book-appointment', '/api/verify-book-appointment',
        '/api/refresh-token', '/api/payos/create-payment-link', '/api/payos/webhook'
    ];
    // Regex check for parameterized public paths
    const isPublic = nonSecurePaths.some(path => {
        const pattern = "^" + path.replace(":id", "[^/]+") + "$";
        const regex = new RegExp(pattern);
        return regex.test(req.path);
    }) || (req.method === 'GET' && (req.path.startsWith('/api/packages/') || req.path.startsWith('/api/facilities/')));

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
        '/api/login-patient-chat', '/api/patient-book-appointment', '/api/verify-book-appointment',
        '/api/refresh-token', '/api/payos/create-payment-link', '/api/payos/webhook'
    ];
    // Regex check for parameterized public paths
    const isPublic = nonSecurePaths.some(path => {
        const pattern = "^" + path.replace(":id", "[^/]+") + "$";
        const regex = new RegExp(pattern);
        return regex.test(req.path);
    }) || (req.method === 'GET' && (req.path.startsWith('/api/packages/') || req.path.startsWith('/api/facilities/')));

    if (isPublic) return next();

    // Các route chỉ yêu cầu đăng nhập thành công (mọi user/patient đều được phép)
    const authenticatedOnlyPaths = [
        '/api/get-patient-appointments',
        '/api/get-patient-history',
        '/api/get_all_questions',
        '/api/submit-assessment',
        '/api/assessment-detail-by-id/:id',
        '/api/assessment-history-by-userid/:userId',
        '/api/category-questions',
        '/api/category-questions/:categoryId/questions',
        '/api/questions/:id',
        '/api/save-fcm-token',
        '/api/send-payment'
    ];

    const isAuthenticatedOnly = authenticatedOnlyPaths.some(path => {
        const pattern = "^" + path.replace(":id", "[^/]+").replace(":userId", "[^/]+").replace(":categoryId", "[^/]+") + "$";
        const regex = new RegExp(pattern);
        return regex.test(req.path);
    });

    if (isAuthenticatedOnly) return next();

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
    createRefreshToken,
    verifyRefreshToken,
    checkAuthenticationUser,
    checkUserPermission
};
