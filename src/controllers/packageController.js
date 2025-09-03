import { raw } from 'body-parser';
import db from '../models/index';
import { Op } from 'sequelize';

let getAllPackages = async (req, res) => {
    try {
        let packages = await db.Package.findAll({
            where: { isActive: true },
            include: [
                {
                    model: db.Facility,
                    as: 'facilityData',
                    attributes: ['name', 'description', 'logo']
                },
                {
                    model: db.Specialty,
                    as: 'specialtyData',
                    attributes: ['name', 'descriptionHTML', 'descriptionMarkdown']
                }
            ],
            order: [['isFeatured', 'DESC'], ['createdAt', 'DESC']],
            raw: false
        });

        return res.status(200).json({
            errCode: 0,
            message: 'OK',
            data: packages
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

let getFeaturedPackages = async (req, res) => {
    try {
        let packages = await db.Package.findAll({
            where: {
                isActive: true,
                isFeatured: true
            },
            include: [
                {
                    model: db.Facility,
                    as: 'facilityData',
                    attributes: ['name', 'description', 'logo']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: 8,
            raw: false
        });

        return res.status(200).json({
            errCode: 0,
            message: 'OK',
            data: packages
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

let getPackageById = async (req, res) => {
    console.log('req.params', req.params);
    try {
        let id = req.params.id;
        if (!id) {
            return res.status(400).json({
                errCode: 1,
                message: 'Missing required parameter'
            });
        }

        let packageData = await db.Package.findOne({
            where: { id: id, isActive: true },
            include: [
                {
                    model: db.Facility,
                    as: 'facilityData',
                    attributes: ['name', 'description', 'logo', 'address', 'phone', 'email', 'website']
                },
                {
                    model: db.Specialty,
                    as: 'specialtyData',
                    attributes: ['name', 'descriptionHTML', 'descriptionMarkdown']
                }
            ],
            raw: false
        });

        if (!packageData) {
            return res.status(404).json({
                errCode: 2,
                message: 'Package not found 1'
            });
        }

        return res.status(200).json({
            errCode: 0,
            message: 'OK',
            data: packageData
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

let searchPackages = async (req, res) => {
    try {
        let {
            keyword,
            category,
            gender,
            minPrice,
            maxPrice,
            facilityId,
            specialtyId,
            ageRange,
            sortBy = 'createdAt',
            sortOrder = 'DESC',
            limit = 10,
            offset = 0
        } = req.query;


        let whereClause = { isActive: true };

        // Search by keyword in name and description
        if (keyword) {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${keyword}%` } },
                { description: { [Op.like]: `%${keyword}%` } }
            ];
        }

        // Filter by category
        if (category) {
            whereClause.category = category;
        }

        // Filter by gender
        if (gender) {
            whereClause.gender = gender;
        }

        // Filter by age range
        if (ageRange) {
            whereClause.ageRange = ageRange;
        }

        // Filter by price range
        if (minPrice || maxPrice) {
            whereClause.price = {};
            if (minPrice) whereClause.price[Op.gte] = parseFloat(minPrice);
            if (maxPrice) whereClause.price[Op.lte] = parseFloat(maxPrice);
        }

        // Filter by facility
        if (facilityId) {
            whereClause.facilityId = facilityId;
        }

        // Filter by specialty
        if (specialtyId) {
            whereClause.specialtyId = specialtyId;
        }

        // Validate sort parameters
        const allowedSortFields = ['name', 'price', 'createdAt', 'isFeatured'];
        const allowedSortOrders = ['ASC', 'DESC'];

        if (!allowedSortFields.includes(sortBy)) {
            sortBy = 'createdAt';
        }
        if (!allowedSortOrders.includes(sortOrder.toUpperCase())) {
            sortOrder = 'DESC';
        }

        let orderClause = [[sortBy, sortOrder.toUpperCase()]];
        if (sortBy !== 'isFeatured') {
            orderClause.unshift(['isFeatured', 'DESC']);
        }

        let packages = await db.Package.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: db.Facility,
                    as: 'facilityData',
                    attributes: ['id', 'name', 'description', 'logo', 'address', 'type', 'level', 'rating']
                },
                {
                    model: db.Specialty,
                    as: 'specialtyData',
                    attributes: ['name', 'descriptionHTML', 'descriptionMarkdown']
                }
            ],
            order: orderClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            raw: false
        });

        // Get unique categories for filter options
        let categories = await db.Package.findAll({
            where: { isActive: true },
            attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('category')), 'category']],
            raw: true
        });

        // Get unique age ranges for filter options
        let ageRanges = await db.Package.findAll({
            where: { isActive: true },
            attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('ageRange')), 'ageRange']],
            raw: true
        });

        return res.status(200).json({
            errCode: 0,
            message: 'OK',
            data: {
                packages: packages.rows,
                total: packages.count,
                limit: parseInt(limit),
                offset: parseInt(offset),
                filters: {
                    categories: categories.map(c => c.category).filter(Boolean),
                    ageRanges: ageRanges.map(a => a.ageRange).filter(Boolean)
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

let createPackage = async (req, res) => {
    try {
        let data = req.body;

        if (!data.name || !data.price) {
            return res.status(400).json({
                errCode: 1,
                message: 'Missing required fields'
            });
        }

        let newPackage = await db.Package.create({
            name: data.name,
            description: data.description,
            price: data.price,
            image: data.image,
            category: data.category,
            gender: data.gender || 'both',
            ageRange: data.ageRange,
            duration: data.duration,
            isActive: data.isActive !== undefined ? data.isActive : true,
            isFeatured: data.isFeatured || false,
            facilityId: data.facilityId,
            specialtyId: data.specialtyId,
            includedServices: data.includedServices ? JSON.stringify(data.includedServices) : null,
            excludedServices: data.excludedServices ? JSON.stringify(data.excludedServices) : null,
            requirements: data.requirements,
            notes: data.notes
        });

        return res.status(201).json({
            errCode: 0,
            message: 'Package created successfully',
            data: newPackage
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

let updatePackage = async (req, res) => {
    try {
        let id = req.params.id;
        let data = req.body;

        if (!id) {
            return res.status(400).json({
                errCode: 1,
                message: 'Missing package ID'
            });
        }

        let packageData = await db.Package.findByPk(id);
        if (!packageData) {
            return res.status(404).json({
                errCode: 2,
                message: 'Package not found 2'
            });
        }

        // Update package
        await packageData.update({
            name: data.name || packageData.name,
            description: data.description || packageData.description,
            price: data.price || packageData.price,
            image: data.image || packageData.image,
            category: data.category || packageData.category,
            gender: data.gender || packageData.gender,
            ageRange: data.ageRange || packageData.ageRange,
            duration: data.duration || packageData.duration,
            isActive: data.isActive !== undefined ? data.isActive : packageData.isActive,
            isFeatured: data.isFeatured !== undefined ? data.isFeatured : packageData.isFeatured,
            facilityId: data.facilityId || packageData.facilityId,
            specialtyId: data.specialtyId || packageData.specialtyId,
            includedServices: data.includedServices ? JSON.stringify(data.includedServices) : packageData.includedServices,
            excludedServices: data.excludedServices ? JSON.stringify(data.excludedServices) : packageData.excludedServices,
            requirements: data.requirements || packageData.requirements,
            notes: data.notes || packageData.notes
        });

        return res.status(200).json({
            errCode: 0,
            message: 'Package updated successfully',
            data: packageData
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

let deletePackage = async (req, res) => {
    try {
        let id = req.params.id;

        if (!id) {
            return res.status(400).json({
                errCode: 1,
                message: 'Missing package ID'
            });
        }

        let packageData = await db.Package.findByPk(id);
        if (!packageData) {
            return res.status(404).json({
                errCode: 2,
                message: 'Package not found 3'
            });
        }

        // Soft delete by setting isActive to false
        await packageData.update({ isActive: false });

        return res.status(200).json({
            errCode: 0,
            message: 'Package deleted successfully'
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

let getFilterOptions = async (req, res) => {
    try {
        // Get unique categories
        let categories = await db.Package.findAll({
            where: { isActive: true },
            attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('category')), 'category']],
            raw: true
        });

        // Get unique age ranges
        let ageRanges = await db.Package.findAll({
            where: { isActive: true },
            attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('ageRange')), 'ageRange']],
            raw: true
        });

        // Get unique genders
        let genders = await db.Package.findAll({
            where: { isActive: true },
            attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('gender')), 'gender']],
            raw: true
        });

        // Get all facilities
        let facilities = await db.Facility.findAll({
            where: { isActive: true },
            attributes: ['id', 'name'],
            order: [['name', 'ASC']]
        });

        // Get all specialties
        let specialties = await db.Specialty.findAll({
            attributes: ['id', 'name'],
            order: [['name', 'ASC']]
        });

        // Get price ranges
        let priceStats = await db.Package.findOne({
            where: { isActive: true },
            attributes: [
                [db.sequelize.fn('MIN', db.sequelize.col('price')), 'minPrice'],
                [db.sequelize.fn('MAX', db.sequelize.col('price')), 'maxPrice']
            ],
            raw: true
        });

        return res.status(200).json({
            errCode: 0,
            message: 'OK',
            data: {
                categories: categories.map(c => c.category).filter(Boolean),
                ageRanges: ageRanges.map(a => a.ageRange).filter(Boolean),
                genders: genders.map(g => g.gender).filter(Boolean),
                facilities: facilities,
                specialties: specialties,
                priceRange: {
                    min: priceStats.minPrice || 0,
                    max: priceStats.maxPrice || 0
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
    getAllPackages,
    getFeaturedPackages,
    getPackageById,
    searchPackages,
    getFilterOptions,
    createPackage,
    updatePackage,
    deletePackage
}; 