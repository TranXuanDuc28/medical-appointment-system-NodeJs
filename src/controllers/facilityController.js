import db from '../models/index';
import { Op } from 'sequelize';
import { sendError, jsonText, plainFacility } from '../utils/legacyMisc';

let getAllFacilities = async (req, res) => {
    try {
        let facilities = await db.Facility.findAll({
            where: { isActive: true },
            order: [['isFeatured', 'DESC'], ['rating', 'DESC'], ['id', 'ASC']],
            raw: false
        });

        return res.status(200).json({
            errCode: 0,
            message: 'OK',
            data: facilities.map(plainFacility)
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            errCode: -1,
            message: 'Error from server',
            error: error.message
        });
    }
};

let getFeaturedFacilities = async (req, res) => {
    try {
        let facilities = await db.Facility.findAll({
            where: {
                isActive: true,
                isFeatured: true
            },
            order: [['rating', 'DESC'], ['totalReviews', 'DESC'], ['id', 'ASC']],
            limit: 10,
            raw: false
        });

        return res.status(200).json({
            errCode: 0,
            message: 'OK',
            data: facilities.map(plainFacility)
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            errCode: -1,
            message: 'Error from server',
            error: error.message
        });
    }
};

let getFacilityById = async (req, res) => {
    try {
        let id = req.params.id;
        if (!id) {
            return res.status(400).json({
                errCode: 1,
                message: 'Missing required parameter'
            });
        }

        let facility = await db.Facility.findOne({
            where: { id: id, isActive: true },
            include: [
                {
                    model: db.Package,
                    as: 'packages',
                    where: { isActive: true },
                    required: false,
                    attributes: ['id', 'name', 'price', 'category', 'image']
                }
            ],
            raw: false
        });

        if (!facility) {
            return res.status(404).json({
                errCode: 2,
                message: 'Facility not found'
            });
        }

        return res.status(200).json({
            errCode: 0,
            message: 'OK',
            data: plainFacility(facility)
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            errCode: -1,
            message: 'Error from server',
            error: error.message
        });
    }
};

let searchFacilities = async (req, res) => {
    try {
        let {
            keyword,
            type,
            level,
            minRating,
            sortBy = 'rating',
            sortOrder = 'DESC',
            limit = 10,
            offset = 0
        } = req.query;

        let whereClause = { isActive: true };

        // Search by keyword in name and description
        if (keyword) {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${keyword}%` } },
                { description: { [Op.like]: `%${keyword}%` } },
                { address: { [Op.like]: `%${keyword}%` } }
            ];
        }

        // Filter by type
        if (type) {
            whereClause.type = type;
        }

        // Filter by level
        if (level) {
            whereClause.level = level;
        }

        // Filter by minimum rating
        if (minRating) {
            whereClause.rating = { [Op.gte]: parseFloat(minRating) };
        }

        // Validate sort parameters
        const allowedSortFields = ['name', 'rating', 'totalReviews', 'createdAt', 'isFeatured'];
        const allowedSortOrders = ['ASC', 'DESC'];

        if (!allowedSortFields.includes(sortBy)) {
            sortBy = 'rating';
        }
        if (!allowedSortOrders.includes(sortOrder.toUpperCase())) {
            sortOrder = 'DESC';
        }

        let orderClause = [[sortBy, sortOrder.toUpperCase()]];
        if (sortBy !== 'isFeatured') {
            orderClause.unshift(['isFeatured', 'DESC']);
        }
        orderClause.push(['id', 'ASC']); // ổn định thứ tự khi trùng giá trị

        let facilities = await db.Facility.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: db.Package,
                    as: 'packages',
                    where: { isActive: true },
                    required: false,
                    attributes: ['id', 'name', 'price', 'category']
                }
            ],
            order: orderClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            raw: false
        });

        // Get unique types for filter options
        let types = await db.Facility.findAll({
            where: { isActive: true },
            attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('type')), 'type']],
            raw: true
        });

        // Get unique levels for filter options
        let levels = await db.Facility.findAll({
            where: { isActive: true },
            attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('level')), 'level']],
            raw: true
        });

        return res.status(200).json({
            errCode: 0,
            message: 'OK',
            data: {
                facilities: facilities.rows.map(plainFacility),
                total: facilities.count,
                limit: parseInt(limit),
                offset: parseInt(offset),
                filters: {
                    types: types.map(t => t.type).filter(Boolean),
                    levels: levels.map(l => l.level).filter(Boolean)
                }
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            errCode: -1,
            message: 'Error from server',
            error: error.message
        });
    }
};

let createFacility = async (req, res) => {
    try {
        let data = req.body;

        if (!data.name) {
            return res.status(400).json({
                errCode: 1,
                message: 'Missing required fields'
            });
        }

        if (data.rating !== undefined && data.rating !== null && data.rating !== '' &&
            !(Number(data.rating) >= 0 && Number(data.rating) <= 5)) {
            return res.status(400).json({ errCode: 3, message: 'Invalid rating (must be between 0 and 5)' });
        }

        let newFacility = await db.Facility.create({
            name: data.name,
            description: data.description,
            logo: data.logo,
            address: data.address,
            phone: data.phone,
            email: data.email,
            website: data.website,
            type: data.type || 'clinic',
            level: data.level || 'private',
            isActive: data.isActive !== undefined ? data.isActive : true,
            isFeatured: data.isFeatured || false,
            rating: data.rating || 0,
            totalReviews: data.totalReviews || 0,
            workingHours: jsonText(data.workingHours),
            services: jsonText(data.services),
            specialties: jsonText(data.specialties),
            images: jsonText(data.images),
            location: jsonText(data.location)
        });

        return res.status(201).json({
            errCode: 0,
            message: 'Facility created successfully',
            data: newFacility
        });
    } catch (error) {
        return sendError(res, error);
    }
};

let updateFacility = async (req, res) => {
    try {
        let id = req.params.id;
        let data = req.body;

        if (!id) {
            return res.status(400).json({
                errCode: 1,
                message: 'Missing facility ID'
            });
        }

        let facility = await db.Facility.findByPk(id, { raw: false });
        if (!facility) {
            return res.status(404).json({
                errCode: 2,
                message: 'Facility not found'
            });
        }

        if (data.rating !== undefined && data.rating !== null && data.rating !== '' &&
            !(Number(data.rating) >= 0 && Number(data.rating) <= 5)) {
            return res.status(400).json({ errCode: 3, message: 'Invalid rating (must be between 0 and 5)' });
        }

        // Update facility
        await facility.update({
            name: data.name || facility.name,
            description: data.description || facility.description,
            logo: data.logo || facility.logo,
            address: data.address || facility.address,
            phone: data.phone || facility.phone,
            email: data.email || facility.email,
            website: data.website || facility.website,
            type: data.type || facility.type,
            level: data.level || facility.level,
            isActive: data.isActive !== undefined ? data.isActive : facility.isActive,
            isFeatured: data.isFeatured !== undefined ? data.isFeatured : facility.isFeatured,
            rating: data.rating || facility.rating,
            totalReviews: data.totalReviews || facility.totalReviews,
            workingHours: data.workingHours ? jsonText(data.workingHours) : facility.workingHours,
            services: data.services ? jsonText(data.services) : facility.services,
            specialties: data.specialties ? jsonText(data.specialties) : facility.specialties,
            images: data.images ? jsonText(data.images) : facility.images,
            location: data.location ? jsonText(data.location) : facility.location
        });

        return res.status(200).json({
            errCode: 0,
            message: 'Facility updated successfully',
            data: facility
        });
    } catch (error) {
        return sendError(res, error);
    }
};

let deleteFacility = async (req, res) => {
    try {
        let id = req.params.id;

        if (!id) {
            return res.status(400).json({
                errCode: 1,
                message: 'Missing facility ID'
            });
        }

        let facility = await db.Facility.findByPk(id, { raw: false });
        if (!facility) {
            return res.status(404).json({
                errCode: 2,
                message: 'Facility not found'
            });
        }

        // Soft delete by setting isActive to false
        await facility.update({ isActive: false });

        return res.status(200).json({
            errCode: 0,
            message: 'Facility deleted successfully'
        });
    } catch (error) {
        return sendError(res, error);
    }
};

let getFilterOptions = async (req, res) => {
    try {
        // Get unique types
        let types = await db.Facility.findAll({
            where: { isActive: true },
            attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('type')), 'type']],
            raw: true
        });

        // Get unique levels
        let levels = await db.Facility.findAll({
            where: { isActive: true },
            attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('level')), 'level']],
            raw: true
        });

        // Get rating ranges
        let ratingStats = await db.Facility.findOne({
            where: { isActive: true },
            attributes: [
                [db.sequelize.fn('MIN', db.sequelize.col('rating')), 'minRating'],
                [db.sequelize.fn('MAX', db.sequelize.col('rating')), 'maxRating']
            ],
            raw: true
        });

        return res.status(200).json({
            errCode: 0,
            message: 'OK',
            data: {
                types: types.map(t => t.type).filter(Boolean),
                levels: levels.map(l => l.level).filter(Boolean),
                ratingRange: {
                    min: Number(ratingStats.minRating) || 0,
                    max: Number(ratingStats.maxRating) || 5
                }
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            errCode: -1,
            message: 'Error from server',
            error: error.message
        });
    }
};

module.exports = {
    getAllFacilities,
    getFeaturedFacilities,
    getFacilityById,
    searchFacilities,
    getFilterOptions,
    createFacility,
    updateFacility,
    deleteFacility
}; 