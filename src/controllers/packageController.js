import { raw } from 'body-parser';
import db from '../models/index';
import { Op } from 'sequelize';

let getAllPackages = async (req, res) => {
    try {
        let lang = req.query.lang || 'vi';
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
                    attributes: ['id', 'image'],
                    include: [
                        {
                            model: db.Specialty_Translation,
                            as: 'specialtyData',
                            where: { lang: lang },
                            attributes: ['name'],
                            required: false
                        },
                        {
                            model: db.Markdown,
                            as: 'specialtyMarkdown',
                            where: { lang: lang },
                            attributes: ['contentHTML', 'contentMarkdown'],
                            required: false
                        }
                    ]
                }
            ],
            order: [['isFeatured', 'DESC'], ['createdAt', 'DESC']],
            raw: false
        });

        let formattedPackages = packages.map(pkg => {
            let pkgJson = pkg.get({ plain: true });
            if (pkgJson.specialtyData) {
                const specialty = pkgJson.specialtyData;
                const translation = specialty.specialtyData && specialty.specialtyData[0] ? specialty.specialtyData[0] : {};
                const markdown = specialty.specialtyMarkdown && specialty.specialtyMarkdown[0] ? specialty.specialtyMarkdown[0] : {};
                
                pkgJson.specialtyData = {
                    id: specialty.id,
                    image: specialty.image,
                    name: translation.name || '',
                    descriptionHTML: markdown.contentHTML || '',
                    descriptionMarkdown: markdown.contentMarkdown || ''
                };
            }
            return pkgJson;
        });

        return res.status(200).json({
            errCode: 0,
            message: 'OK',
            data: formattedPackages
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
        let lang = req.query.lang || 'vi';
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
                    attributes: ['id', 'image'],
                    include: [
                        {
                            model: db.Specialty_Translation,
                            as: 'specialtyData',
                            where: { lang: lang },
                            attributes: ['name'],
                            required: false
                        },
                        {
                            model: db.Markdown,
                            as: 'specialtyMarkdown',
                            where: { lang: lang },
                            attributes: ['contentHTML', 'contentMarkdown'],
                            required: false
                        }
                    ]
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

        let pkgJson = packageData.get({ plain: true });
        if (pkgJson.specialtyData) {
            const specialty = pkgJson.specialtyData;
            const translation = specialty.specialtyData && specialty.specialtyData[0] ? specialty.specialtyData[0] : {};
            const markdown = specialty.specialtyMarkdown && specialty.specialtyMarkdown[0] ? specialty.specialtyMarkdown[0] : {};
            
            pkgJson.specialtyData = {
                id: specialty.id,
                image: specialty.image,
                name: translation.name || '',
                descriptionHTML: markdown.contentHTML || '',
                descriptionMarkdown: markdown.contentMarkdown || ''
            };
        }

        return res.status(200).json({
            errCode: 0,
            message: 'OK',
            data: pkgJson
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
                    attributes: ['id', 'image'],
                    include: [
                        {
                            model: db.Specialty_Translation,
                            as: 'specialtyData',
                            where: { lang: req.query.lang || 'vi' },
                            attributes: ['name'],
                            required: false
                        },
                        {
                            model: db.Markdown,
                            as: 'specialtyMarkdown',
                            where: { lang: req.query.lang || 'vi' },
                            attributes: ['contentHTML', 'contentMarkdown'],
                            required: false
                        }
                    ]
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

        let formattedRows = packages.rows.map(pkg => {
            let pkgJson = pkg.get({ plain: true });
            if (pkgJson.specialtyData) {
                const specialty = pkgJson.specialtyData;
                const translation = specialty.specialtyData && specialty.specialtyData[0] ? specialty.specialtyData[0] : {};
                const markdown = specialty.specialtyMarkdown && specialty.specialtyMarkdown[0] ? specialty.specialtyMarkdown[0] : {};
                
                pkgJson.specialtyData = {
                    id: specialty.id,
                    image: specialty.image,
                    name: translation.name || '',
                    descriptionHTML: markdown.contentHTML || '',
                    descriptionMarkdown: markdown.contentMarkdown || ''
                };
            }
            return pkgJson;
        });

        return res.status(200).json({
            errCode: 0,
            message: 'OK',
            data: {
                packages: formattedRows,
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
        let lang = req.query.lang || 'vi';
        let specialtiesData = await db.Specialty.findAll({
            include: [
                {
                    model: db.Specialty_Translation,
                    as: 'specialtyData',
                    where: { lang: lang },
                    attributes: ['name'],
                    required: false
                }
            ],
            raw: false
        });

        let specialties = specialtiesData.map(item => {
            let translation = item.specialtyData && item.specialtyData[0] ? item.specialtyData[0] : {};
            return {
                id: item.id,
                name: translation.name || ''
            };
        });

        specialties.sort((a, b) => (a.name || '').localeCompare(b.name || '', lang));

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

const FACILITY_TO_DOCTORS = {
    21: [2, 8],        // Doctor Check -> BS Ngô Thị Mỹ Lành, BS Ngô Văn Bảo
    22: [22, 27],      // PK BV ĐH Y Dược 1 -> PGS.TS Lê Thị Tuyết Lan, GS.TS Hà Văn Quyết
    23: [26, 21, 25],  // Thu Cúc TCI -> BSCKII Trần Thị Minh Hằng, PGS.TS Nguyễn Văn Doanh, ThS.BS Đỗ Thị Tú Anh
    24: [17, 24],      // BV Nam học & Hiếm muộn -> ThS.BS Nguyễn Trung Nhật, BS Nguyễn Tuấn Việt
    25: [28],          // BV Đa khoa Hồng Phát -> GS.TS Vũ Văn Hòe
};

const TIME_SLOTS_DEF = [
    { key: "T1", label: "08:00 - 09:00" },
    { key: "T2", label: "09:00 - 10:00" },
    { key: "T3", label: "10:00 - 11:00" },
    { key: "T4", label: "11:00 - 12:00" },
    { key: "T5", label: "13:00 - 14:00" },
    { key: "T6", label: "14:00 - 15:00" },
    { key: "T7", label: "15:00 - 16:00" },
    { key: "T8", label: "16:00 - 17:00" },
];

let getPackageBookingSlots = async (req, res) => {
    try {
        let { facilityId, date, doctorId } = req.query;
        let lang = req.query.lang || 'vi';

        if (!facilityId) {
            facilityId = 22; // default PK ĐH Y Dược 1
        }
        if (!date) {
            date = new Date(Date.now() + 86400000).setHours(0, 0, 0, 0).toString();
        }

        // 1. Get candidate doctors for facility
        let candidateDoctorIds = FACILITY_TO_DOCTORS[facilityId] || [22, 27];

        let rawDoctors = await db.User.findAll({
            where: { id: { [Op.in]: candidateDoctorIds } },
            attributes: ['id', 'firstName', 'lastName'],
            include: [
                {
                    model: db.AllCode,
                    as: 'positionData',
                    attributes: ['valueVi', 'valueEn']
                },
                {
                    model: db.Doctor_Infor,
                    where: { lang: lang },
                    required: false,
                    include: [
                        {
                            model: db.Specialty,
                            as: 'doctorSpecialty',
                            include: [
                                {
                                    model: db.Specialty_Translation,
                                    where: { lang: lang },
                                    as: 'specialtyData',
                                    required: false
                                }
                            ]
                        }
                    ]
                }
            ],
            raw: false
        });

        let availableDoctors = rawDoctors.map(d => {
            let pos = d.positionData ? (lang === 'vi' ? d.positionData.valueVi : d.positionData.valueEn) : '';
            let specialty = d.Doctor_Infor?.doctorSpecialty?.specialtyData?.[0]?.name || 'Nội tổng quát';
            return {
                id: d.id,
                name: `${pos ? pos + ' ' : ''}${d.lastName} ${d.firstName}`.trim(),
                position: pos,
                specialty: specialty
            };
        });

        // 2. Capacity & Slot availability calculation
        const MAX_PER_DOCTOR = 3; // Maximum 3 package appointments per doctor per 1-hour slot
        let slots = [];

        for (let slotDef of TIME_SLOTS_DEF) {
            if (doctorId && doctorId !== 'auto') {
                // Patient explicitly selected a specific doctor
                let targetDoc = availableDoctors.find(d => String(d.id) === String(doctorId)) || availableDoctors[0];
                let bookedCount = await db.Booking.count({
                    where: {
                        doctorId: targetDoc.id,
                        date: date,
                        timeType: slotDef.key,
                        statusId: { [Op.in]: ['S1', 'S2'] }
                    }
                });

                let freeSeats = Math.max(0, MAX_PER_DOCTOR - bookedCount);
                slots.push({
                    key: slotDef.key,
                    label: slotDef.label,
                    isFull: freeSeats <= 0,
                    bookedCount: bookedCount,
                    maxCount: MAX_PER_DOCTOR,
                    availableSeats: freeSeats,
                    assignedDoctor: targetDoc
                });
            } else {
                // Auto / Load-balanced assignment
                let doctorLoads = [];
                for (let doc of availableDoctors) {
                    let bookedCount = await db.Booking.count({
                        where: {
                            doctorId: doc.id,
                            date: date,
                            timeType: slotDef.key,
                            statusId: { [Op.in]: ['S1', 'S2'] }
                        }
                    });
                    doctorLoads.push({
                        doctor: doc,
                        bookedCount: bookedCount,
                        freeSeats: Math.max(0, MAX_PER_DOCTOR - bookedCount)
                    });
                }

                // Pick the doctor with the least load (most free seats)
                doctorLoads.sort((a, b) => a.bookedCount - b.bookedCount);
                let bestDocLoad = doctorLoads[0] || { doctor: availableDoctors[0], bookedCount: 0, freeSeats: MAX_PER_DOCTOR };
                let totalFreeSeats = doctorLoads.reduce((sum, d) => sum + d.freeSeats, 0);

                slots.push({
                    key: slotDef.key,
                    label: slotDef.label,
                    isFull: totalFreeSeats <= 0,
                    bookedCount: bestDocLoad.bookedCount,
                    maxCount: MAX_PER_DOCTOR,
                    availableSeats: totalFreeSeats,
                    assignedDoctor: bestDocLoad.doctor
                });
            }
        }

        return res.status(200).json({
            errCode: 0,
            message: 'OK',
            data: {
                availableDoctors: availableDoctors,
                slots: slots
            }
        });
    } catch (error) {
        console.error('Error in getPackageBookingSlots:', error);
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
    getPackageBookingSlots,
    searchPackages,
    getFilterOptions,
    createPackage,
    updatePackage,
    deletePackage
}; 