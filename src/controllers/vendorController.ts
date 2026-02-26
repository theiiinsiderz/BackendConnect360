import { Request, Response } from 'express';
import cloudinary from '../config/cloudinary';
import prisma from '../prisma';

type UploadedFile = {
    buffer?: Buffer;
    mimetype?: string;
};

const getUploadedFile = (req: Request, fieldName: string): UploadedFile | undefined => {
    const files = (req as Request & { files?: Record<string, unknown> }).files;
    if (!files || typeof files !== 'object') {
        return undefined;
    }

    const fieldValue = files[fieldName];
    if (!Array.isArray(fieldValue) || fieldValue.length === 0) {
        return undefined;
    }

    return fieldValue[0] as UploadedFile;
};

const uploadToCloudinary = async (file: UploadedFile | undefined, prefix: string) => {
    if (!file?.buffer) {
        return undefined;
    }

    const publicId = `${prefix}-${Date.now()}`;

    return new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'company',
                public_id: publicId,
                resource_type: 'image',
            },
            (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(result?.secure_url || '');
            }
        );

        stream.end(file.buffer);
    });
};

const normalizeText = (value: unknown): string | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
};

export const listVendors = async (req: Request, res: Response) => {
    try {
        const vendors = await prisma.company.findMany({
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({ vendors });
    } catch (error) {
        console.error('List vendors error:', error);
        return res.status(500).json({ message: 'Failed to fetch vendors' });
    }
};

export const createVendor = async (req: Request, res: Response) => {
    try {
        const name = normalizeText(req.body?.name);
        const contactEmail = normalizeText(req.body?.contactEmail);

        if (!name) {
            return res.status(400).json({ message: 'Vendor name is required' });
        }

        const logo = getUploadedFile(req, 'logo');
        const qrDesign = getUploadedFile(req, 'qrDesign');
        const [logoUrl, qrDesignUrl] = await Promise.all([
            uploadToCloudinary(logo, 'logo'),
            uploadToCloudinary(qrDesign, 'qr-design')
        ]);

        const vendor = await prisma.company.create({
            data: {
                name,
                contactEmail,
                logoUrl,
                qrDesignUrl
            }
        });

        return res.status(201).json({ message: 'Vendor created', vendor });
    } catch (error) {
        console.error('Create vendor error:', error);
        return res.status(500).json({ message: 'Failed to create vendor' });
    }
};

export const updateVendor = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const name = normalizeText(req.body?.name);
        const contactEmail = normalizeText(req.body?.contactEmail);
        const logo = getUploadedFile(req, 'logo');
        const qrDesign = getUploadedFile(req, 'qrDesign');
        const [uploadedLogoUrl, uploadedQrDesignUrl] = await Promise.all([
            uploadToCloudinary(logo, `logo-${id}`),
            uploadToCloudinary(qrDesign, `qr-design-${id}`)
        ]);

        const vendor = await prisma.company.update({
            where: { id },
            data: {
                ...(name ? { name } : {}),
                ...(contactEmail ? { contactEmail } : {}),
                ...(uploadedLogoUrl ? { logoUrl: uploadedLogoUrl } : {}),
                ...(uploadedQrDesignUrl ? { qrDesignUrl: uploadedQrDesignUrl } : {})
            }
        });

        return res.status(200).json({ message: 'Vendor updated', vendor });
    } catch (error: any) {
        if (error?.code === 'P2025') {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        console.error('Update vendor error:', error);
        return res.status(500).json({ message: 'Failed to update vendor' });
    }
};

export const deleteVendor = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.company.delete({ where: { id } });

        return res.status(200).json({ message: 'Vendor deleted' });
    } catch (error: any) {
        if (error?.code === 'P2025') {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        if (error?.code === 'P2003') {
            return res.status(400).json({ message: 'Cannot delete vendor with linked tags' });
        }

        console.error('Delete vendor error:', error);
        return res.status(500).json({ message: 'Failed to delete vendor' });
    }
};
