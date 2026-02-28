import { PrismaClient, Branch } from '@prisma/client';

const prisma = new PrismaClient();

const LEGACY_DEPARTMENT_NAMES = ['Royston', 'Roystton', 'royston', 'roystton'];

export const fullHierarchy = {
    "Chessington": {
        "Tech": {
            "Software Development": {
                "Tech": {
                    "AI": [],
                    "Software": [],
                    "Analytics": []
                },
                "IT": {
                    "Hardware & Networking": [],
                    "Website": []
                }
            },
            "Software": {
                "Tech": {
                    "AI": [],
                    "Software": [],
                    "Analytics": []
                },
                "IT": {
                    "Hardware & Networking": [],
                    "Website": []
                }
            }
        },
        "Sector Group": {},
        "Trade Group": {},
        "Support": {
            "NI": {
                "Tech": {
                    "Tech": {
                        "AI": [],
                        "Software": [],
                        "Analytics": []
                    },
                    "IT": {
                        "Hardware & Networking": [],
                        "Website": []
                    }
                },
                "Marketing": {},
                "HR & Recruitment": {
                    "HR": [],
                    "Recruitment": []
                },
                "Finance": [],
                "Fleet": {
                    "All": [],
                    "Trade Group": []
                }
            },
            "Pension": {
                "Tech": {
                    "Tech": {
                        "AI": [],
                        "Software": [],
                        "Analytics": []
                    },
                    "IT": {
                        "Hardware & Networking": [],
                        "Website": []
                    }
                },
                "Marketing": {},
                "HR & Recruitment": {
                    "HR": [],
                    "Recruitment": []
                },
                "Finance": [],
                "Fleet": {
                    "All": [],
                    "Trade Group": []
                }
            },
            "Insurance": {
                "P&E Liab Insurance": [],
                "Credit Insurance": [],
                "Key Man Insurance": [],
                "Professional Indemnity Insurance": [],
                "D & O Insurance": [],
                "Health Insurance": []
            },
            "Legal": {
                "Legal Fees": [],
                "Legal Insurance": []
            },
            "Travel Cost": [],
            "Office": {
                "Telephones & Mobiles": {
                    "Telephone": [],
                    "Mobiles": []
                },
                "Entertainment": {
                    "Staff": [],
                    "Client": []
                },
                "Stationary": [],
                "Equipment and Furniture Hire": [],
                "Refreshments": [],
                "Clothing Costs": {
                    "Tech": [],
                    "Fleet": [],
                    "Support": [],
                    "Finance": [],
                    "HR & Recruitment": [],
                    "Marketing": []
                }
            },
            "Marketing": {
                "Paid Search": {
                    "PPC": []
                },
                "Software": {
                    "PPC": [],
                    "Non-PPC": []
                }
            },
            "Finance": {
                "Charges": {
                    "Credit Card Charges": [],
                    "Bank Charges": [],
                    "HMRC Interest & Charges": []
                },
                "Fees": {
                    "Professional": [],
                    "Audit & Accountancy": []
                },
                "Software": []
            },
            "HR & Recruitment": {
                "Training": {
                    "Engineers": [],
                    "Staff": []
                },
                "Software": {
                    "HR": [],
                    "Recruitment": []
                }
            },
            "Utilities": {
                "Cleaning": [],
                "Electricity": [],
                "General Rates": [],
                "Rent": [],
                "Waste Removal": [],
                "Water": []
            }
        },
        "Fleet": {
            "Software": {
                "All": [],
                "Trade Group": []
            },
            "Fines & Charges": {
                "Fines": {
                    "Parking Fines": []
                },
                "Charges": {
                    "Congestion Charges": [],
                    "Vehicle Lease Charges": [],
                    "Vehicle Hire & Other Charges": [],
                    "Vehicle Tax": []
                },
                "Insurance": {
                    "Vehicle Insurance": []
                },
                "Interest": {
                    "Lease Interest": []
                }
            },
            "Repairs and Services": {
                "Repairs": [],
                "Services": []
            },
            "New Vehicles": {
                "All": [],
                "Trade Group": []
            },

        },
        "Assets": {
            "Aspect-Owned": {
                "Non-Fixed": {
                    "Tools & Equipment": {
                        "LDR": {
                            "Leak Detection Equipment": [
                                "Acoustic leak detectors",
                                "Tracer gas kits"
                            ],
                            "Moisture Meters": [
                                "Pin meters",
                                "Non-invasive moisture meters"
                            ],
                            "Thermal Imaging Cameras": [
                                "Handheld thermal cameras",
                                "High-resolution survey cameras"
                            ],
                            "Drying & Restoration Equipment": [
                                "Air movers",
                                "Dehumidifiers"
                            ]
                        },
                        "Plumbing & Drainage": {
                            "Drainage Inspection Tools": [
                                "CCTV drain cameras",
                                "Push-rod cameras"
                            ],
                            "Drain Cleaning Tools": [
                                "Jetting machines",
                                "Root cutters"
                            ],
                            "Plumbing Tools": [
                                "Pipe freezing kits",
                                "Press tools"
                            ]
                        },
                        "Building Fabric": {
                            "Cleaning & Remediation": [
                                "Fogging machines",
                                "Misting units"
                            ]
                        },
                        "HVAC & Electrical": {
                            "HVAC Commissioning Tools": [
                                "Balometers",
                                "Anemometers",
                                "Flow hoods"
                            ],
                            "Heating Test Equipment": [
                                "Combustion analysers",
                                "Flue gas analysers"
                            ],
                            "Refrigeration Tools": [
                                "F-Gas leak detectors",
                                "Manifold gauges",
                                "Recovery units"
                            ],
                            "Electrical Test Equipment": [
                                "Multimeters",
                                "Insulation testers",
                                "Earth loop testers"
                            ]
                        },
                        "Fire Safety": {
                            "Fire Systems Tools": [
                                "Loop testers",
                                "Smoke aerosol testers"
                            ],
                            "Vent Hygiene Tools": [
                                "Rotary brush machines",
                                "Air whips",
                                "HEPA vacuums",
                                "Duct inspection cameras"
                            ]
                        },
                        "Environmental": {
                            "Water Hygiene Tools": [
                                "Temperature probes",
                                "Sampling kits",
                                "Flushing units"
                            ],
                            "IAQ Monitoring Equipment": [
                                "CO₂ sensors",
                                "Particulate monitors"
                            ]
                        }
                    },
                    "Access Equipment": {
                        "Working at Height": [
                            "Harnesses",
                            "Fall arrest kits"
                        ],
                        "Mobile Platforms": [
                            "MEWPs",
                            "Scissor lifts"
                        ]
                    }
                },
                "Fixed": {
                    "Infrastructure": [
                        "Workshop Equipment",
                        "Calibration Systems",
                        "Training Assets"
                    ],
                    "IT & Digital": [
                        "Fixed IT Systems"
                    ],
                    "Vehicle Add-ons": [
                        "Workshop Equipment"
                    ]
                }
            },
            "Customer-Owned": {
                "Fixed": {
                    "Gas & Electrical": [
                        "Heating Systems",
                        "Heat Pump Systems",
                        "Ventilation Systems",
                        "Ductwork Systems",
                        "Cooling Systems",
                        "Cooling Towers",
                        "LV Distribution",
                        "Emergency Power",
                        "Gas Distribution"
                    ],
                    "Gas & HVAC": [
                        "Heating Systems",
                        "Ventilation Systems"
                    ],
                    "Fire Safety": [
                        "Fire Detection Systems",
                        "Fire Suppression Systems",
                        "Smoke Control Systems",
                        "Vent Hygiene Systems"
                    ],
                    "Leak Detection": [
                        "Domestic Water Systems",
                        "Process Water Systems"
                    ],
                    "Environmental Services": [
                        "IAQ Systems"
                    ],
                    "Building Fabric": [
                        "Fixed Access Systems"
                    ],
                    "Drainage & Plumbing": [
                        "Below-Ground Drainage",
                        "Above-Ground Drainage",
                        "Drainage Assets",
                        "Pumped Drainage",
                        "Domestic Plumbing",
                        "Sanitary Systems",
                        "Valves & Controls",
                        "Booster Systems",
                        "Water Storage",
                        "Greywater Systems"
                    ]
                },
                "Non-Fixed": {
                    "Gas & Electrical": [
                        "Temporary HVAC"
                    ],
                    "Fire Safety": [
                        "Temporary Ventilation"
                    ],
                    "Temporary Systems": [
                        "Temporary Drainage",
                        "Temporary Plumbing"
                    ]
                }
            }
        }
    }
};

async function createCategory(
    name: string,
    parentId: string | null,
    departmentId: string,
    children: any
) {
    try {
        const category = await prisma.spendingCategory.create({
            data: {
                name,
                parentId,
                departmentId,
                branch: Branch.CHESSINGTON
            }
        });

        if (Array.isArray(children)) {
            if (children.length === 0) {
                return;
            }

            for (const child of children) {
                if (typeof child === 'string') {
                    await prisma.spendingCategory.create({
                        data: {
                            name: child,
                            parentId: category.id,
                            departmentId,
                            branch: Branch.CHESSINGTON
                        }
                    });
                }
            }
        } else if (typeof children === 'object' && children !== null) {
            for (const [key, value] of Object.entries(children)) {
                await createCategory(key, category.id, departmentId, value);
            }
        }
    } catch (error) {
        console.error(`Error creating category ${name}:`, error);
    }
}

async function main() {
    await cleanupLegacyDepartments();

    for (const [deptName, hierarchy] of Object.entries(fullHierarchy)) {
        console.log(`Processing department: ${deptName}`);

        let department = await prisma.department.findUnique({
            where: { name: deptName }
        });

        if (!department) {
            department = await prisma.department.create({
                data: {
                    name: deptName,
                    budget: 0
                }
            });
            console.log(`Created department: ${deptName}`);
        } else {
            console.log(`Found existing department: ${deptName}, clearing existing categories...`);
            await deleteCategoriesRecursively(department.id);
        }

        // Seed Categories
        console.log(`Seeding categories for ${deptName}...`);
        for (const [key, value] of Object.entries(hierarchy)) {
            await createCategory(key, null, department.id, value);
        }
    }
}

async function cleanupLegacyDepartments() {
    // Normalize legacy budget category labels so reporting and filters remain clean.
    await prisma.purchaseRequest.updateMany({
        where: {
            budgetCategory: {
                in: LEGACY_DEPARTMENT_NAMES
            }
        },
        data: {
            budgetCategory: 'Chessington'
        }
    });

    const chessingtonDepartment = await prisma.department.findUnique({
        where: { name: 'Chessington' },
        select: { id: true }
    });

    const legacyDepartments = await prisma.department.findMany({
        where: {
            name: {
                in: LEGACY_DEPARTMENT_NAMES
            }
        },
        select: { id: true, name: true }
    });

    for (const legacyDepartment of legacyDepartments) {
        console.log(`Removing legacy department: ${legacyDepartment.name}`);

        await prisma.user.updateMany({
            where: { departmentId: legacyDepartment.id },
            data: {
                departmentId: chessingtonDepartment?.id ?? null
            }
        });

        await deleteCategoriesRecursively(legacyDepartment.id);
        await prisma.department.delete({ where: { id: legacyDepartment.id } });
    }
}

async function deleteCategoriesRecursively(departmentId: string) {
    while (true) {
        const parents = await prisma.spendingCategory.findMany({
            where: { departmentId, parentId: { not: null } },
            select: { parentId: true },
            distinct: ['parentId']
        });

        const parentIds = parents.map(p => p.parentId).filter(id => id !== null) as string[];

        const { count } = await prisma.spendingCategory.deleteMany({
            where: {
                departmentId,
                id: { notIn: parentIds }
            }
        });

        if (count === 0) break;
    }

    await prisma.spendingCategory.deleteMany({ where: { departmentId } });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
