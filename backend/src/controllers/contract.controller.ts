import { Request, Response } from 'express';
import { PrismaClient, ContractStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Get all contracts with optional filters
export const getAllContracts = async (req: Request, res: Response) => {
    try {
        const { status, supplierId, expiringSoon } = req.query;

        let where: any = {};

        if (status) {
            where.status = status as ContractStatus;
        }

        if (supplierId) {
            where.supplierId = supplierId as string;
        }

        // Filter for contracts expiring within 90 days
        if (expiringSoon === 'true') {
            const ninetyDaysFromNow = new Date();
            ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

            where.endDate = {
                lte: ninetyDaysFromNow,
                gte: new Date(),
            };
            where.status = ContractStatus.ACTIVE;
        }

        const contracts = await prisma.contract.findMany({
            where,
            include: {
                supplier: {
                    select: {
                        id: true,
                        name: true,
                        category: true,
                        logoUrl: true,
                    },
                },
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                endDate: 'asc',
            },
        });

        // Calculate status based on dates
        const contractsWithCalculatedStatus = contracts.map(contract => {
            const now = new Date();
            const endDate = new Date(contract.endDate);
            const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            let calculatedStatus = contract.status;

            if (contract.status === ContractStatus.ACTIVE) {
                if (daysUntilExpiry < 0) {
                    calculatedStatus = ContractStatus.EXPIRED;
                } else if (daysUntilExpiry <= 90) {
                    calculatedStatus = ContractStatus.EXPIRING_SOON;
                }
            }

            return {
                ...contract,
                status: calculatedStatus,
                daysUntilExpiry: daysUntilExpiry > 0 ? daysUntilExpiry : 0,
            };
        });

        res.status(200).json(contractsWithCalculatedStatus);
    } catch (error) {
        console.error('Error fetching contracts:', error);
        res.status(500).json({ error: 'Failed to fetch contracts' });
    }
};

// Get contract by ID
export const getContractById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        const contract = await prisma.contract.findUnique({
            where: { id },
            include: {
                supplier: {
                    select: {
                        id: true,
                        name: true,
                        category: true,
                        contactName: true,
                        contactEmail: true,
                        logoUrl: true,
                    },
                },
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        department: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        res.status(200).json(contract);
    } catch (error) {
        console.error('Error fetching contract:', error);
        res.status(500).json({ error: 'Failed to fetch contract' });
    }
};

// Create new contract
export const createContract = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const {
            title,
            supplierId,
            startDate,
            endDate,
            totalValue,
            currency = 'USD',
            paymentTerms,
            autoRenew = false,
            noticePeriodDays = 30,
            description,
            terms,
            notes,
        } = req.body;

        // Validation
        if (!title || !supplierId || !startDate || !endDate || !totalValue) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate user exists
        const userExists = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!userExists) {
            return res.status(401).json({ error: 'User not found. Please logout and login again.' });
        }

        // Generate unique contract number
        const lastContract = await prisma.contract.findFirst({
            orderBy: { createdAt: 'desc' },
        });

        let nextNumber = 1;
        if (lastContract && lastContract.contractNumber) {
            const parts = lastContract.contractNumber.split('-');
            if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
                nextNumber = parseInt(parts[1]) + 1;
            }
        }

        const contractNumber = `CNT-${String(nextNumber).padStart(6, '0')}`;

        const contract = await prisma.contract.create({
            data: {
                contractNumber,
                title,
                supplierId,
                ownerId: userId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                totalValue,
                currency,
                paymentTerms,
                autoRenew,
                noticePeriodDays,
                description,
                terms,
                notes,
                status: ContractStatus.DRAFT,
            },
            include: {
                supplier: {
                    select: {
                        id: true,
                        name: true,
                        category: true,
                        logoUrl: true,
                    },
                },
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        res.status(201).json(contract);
    } catch (error) {
        console.error('Error creating contract:', error);
        res.status(500).json({ error: 'Failed to create contract' });
    }
};

// Update contract
export const updateContract = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const contract = await prisma.contract.findUnique({
            where: { id },
        });

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        const updatedContract = await prisma.contract.update({
            where: { id },
            data: req.body,
            include: {
                supplier: {
                    select: {
                        id: true,
                        name: true,
                        category: true,
                        logoUrl: true,
                    },
                },
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        res.status(200).json(updatedContract);
    } catch (error) {
        console.error('Error updating contract:', error);
        res.status(500).json({ error: 'Failed to update contract' });
    }
};

// Delete contract
export const deleteContract = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const contract = await prisma.contract.findUnique({
            where: { id },
        });

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        await prisma.contract.delete({
            where: { id },
        });

        res.status(200).json({ message: 'Contract deleted successfully' });
    } catch (error) {
        console.error('Error deleting contract:', error);
        res.status(500).json({ error: 'Failed to delete contract' });
    }
};
