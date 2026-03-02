import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { UserRole } from '@prisma/client';
import prisma from '../config/db';
import Logger from '../utils/logger';

export const exportPdf = async (req: Request, res: Response) => {
    try {
        const currentUser = req.user;
        if (!currentUser) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { requestId, orderId } = req.query;

        if (!requestId && !orderId) {
            return res.status(400).json({ error: 'Request ID or Order ID is required' });
        }

        let order: any = null;
        let requestInfo: any = null;

        if (orderId) {
            order = await prisma.purchaseOrder.findUnique({
                where: { id: String(orderId) },
                include: {
                    supplier: true,
                    request: {
                        include: {
                            requester: {
                                select: {
                                    id: true,
                                    name: true,
                                    departmentId: true,
                                },
                            },
                            items: true,
                        },
                    },
                }
            });
            if (!order) return res.status(404).json({ error: 'Order not found' });
            requestInfo = order.request;
        } else if (requestId) {
            requestInfo = await prisma.purchaseRequest.findUnique({
                where: { id: String(requestId) },
                include: {
                    items: true,
                    requester: {
                        select: {
                            id: true,
                            name: true,
                            departmentId: true,
                        },
                    },
                    order: { include: { supplier: true } },
                }
            });
            if (!requestInfo) return res.status(404).json({ error: 'Request not found' });
            order = requestInfo.order; // Get the associated order if it exists
        }

        if (!requestInfo) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (currentUser.role === UserRole.MEMBER && requestInfo.requesterId !== currentUser.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (
            (currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.SENIOR_MANAGER) &&
            (!currentUser.departmentId || requestInfo.requester?.departmentId !== currentUser.departmentId)
        ) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const supplierName = order?.supplier?.name || "Global Supplier";
        const supplierEmail = order?.supplier?.contactEmail || "supplier@example.com";
        const requesterName = requestInfo?.requester?.name || "Global Corp Representative";
        const items = requestInfo?.items || [];
        const totalAmount = order?.totalAmount ? Number(order.totalAmount) : (requestInfo?.totalAmount ? Number(requestInfo.totalAmount) : items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0));

        const doc = new PDFDocument({ margin: 50 });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            res.setHeader('Content-Length', Buffer.byteLength(pdfData));
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=purchase_order_${orderId || requestId}.pdf`);
            res.end(pdfData);
        });

        // Header
        const typeText = order ? 'Purchase Order' : 'Purchase Request';
        doc.fontSize(20).text('Aspect Powered by Chumley.ai', { align: 'left' });
        doc.fontSize(10).text('Global Corp Procurement', { align: 'left' });
        doc.moveDown();

        const documentId = order ? order.id.slice(0, 8) : requestInfo.id.slice(0, 8);
        doc.fontSize(16).text(`${typeText} #${documentId}`, { align: 'left' });
        doc.moveDown();

        doc.fontSize(12).text(`Supplier: ${supplierName}`);
        doc.fontSize(10).text(`Email: ${supplierEmail}`);
        doc.moveDown();

        doc.fontSize(12).text(`Requester: ${requesterName}`);
        const createdDate = order?.createdAt || requestInfo?.createdAt || new Date();
        doc.fontSize(10).text(`Date: ${new Date(createdDate).toLocaleDateString()}`);
        doc.moveDown(2);

        // Items logic
        doc.fontSize(14).text('Items:');
        doc.moveDown();

        items.forEach((item: any, index: number) => {
            const rowText = `${index + 1}. ${item.description} - Qty: ${item.quantity} x £${Number(item.unitPrice).toFixed(2)}`;
            doc.fontSize(11).text(rowText);
            doc.fontSize(11).text(`Total: £${(Number(item.quantity) * Number(item.unitPrice)).toFixed(2)}`, { align: 'right' });
            doc.moveDown(0.5);
        });

        doc.moveDown(2);
        doc.fontSize(14).text(`Total Amount: £${totalAmount.toFixed(2)}`, { align: 'right' });

        // Footer
        doc.moveDown(4);
        doc.fillColor('gray').fontSize(10).text('This is an automatically generated document by Aspect Procurement System.', { align: 'center' });

        doc.end();
    } catch (error) {
        Logger.error('Failed to generate export PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
};
