import IncentiveSetting from '../models/IncentiveSetting.js';

export const INCENTIVE_REQUIRED_FIELDS = [
    'customerName',
    'customerPhone',
    'customerEmail',
    'customerAddress',
    'customerState',
    'customerCity',
    'plumberName',
    'plumberPhone',
];

export const isValuePresent = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
};

export const isSaleFormComplete = (saleLike) =>
    INCENTIVE_REQUIRED_FIELDS.every((field) => isValuePresent(saleLike?.[field]));

export const ensureIncentiveSettings = async () => {
    let settings = await IncentiveSetting.findOne();

    if (!settings) {
        settings = await IncentiveSetting.create({});
    }

    return settings;
};

export const getIncentiveTypeForSale = (saleLike) => {
    if (saleLike?.subDealer) return 'sub_dealer';
    if (saleLike?.dealer) return 'dealer';
    if (saleLike?.distributor) return 'distributor';
    return null;
};

export const getIncentiveAmountForType = async (type) => {
    const settings = await ensureIncentiveSettings();

    if (type === 'sub_dealer') return settings.subDealerPerSaleIncentive || 0;
    if (type === 'dealer') return settings.dealerPerSaleIncentive || 0;
    if (type === 'distributor') return settings.distributorPerSaleIncentive || 0;
    return 0;
};

export const recomputeSaleIncentive = async (sale, options = {}) => {
    const {
        editedByRole = null,
        editedByUserId = null,
    } = options;

    const incentiveType = getIncentiveTypeForSale(sale);
    sale.incentiveType = incentiveType;

    if (sale.incentiveStatus === 'approved') {
        return sale;
    }

    if (!incentiveType) {
        sale.incentiveEligible = false;
        sale.incentiveAmount = 0;
        sale.incentiveStatus = 'not_applicable';
        return sale;
    }

    if (sale.adminTouchedForm) {
        sale.incentiveEligible = false;
        sale.incentiveAmount = 0;
        sale.incentiveStatus = 'not_applicable';
        return sale;
    }

    const isComplete = isSaleFormComplete(sale);

    if (!isComplete) {
        sale.incentiveEligible = true;
        if (sale.incentiveStatus !== 'approved' && sale.incentiveStatus !== 'rejected') {
            sale.incentiveStatus = 'incomplete';
        }
        sale.incentiveAmount = await getIncentiveAmountForType(incentiveType);
        return sale;
    }

    const isOriginalSeller =
        sale.createdByUserId &&
        editedByUserId &&
        sale.createdByUserId.toString() === editedByUserId.toString() &&
        sale.createdByRole === editedByRole;

    if (!isOriginalSeller) {
        sale.incentiveEligible = false;
        sale.incentiveAmount = 0;
        sale.incentiveStatus = 'not_applicable';
        return sale;
    }

    sale.formCompletedByRole = editedByRole;
    sale.formCompletedByUserId = editedByUserId;
    sale.incentiveEligible = true;
    sale.incentiveAmount = await getIncentiveAmountForType(incentiveType);

    if (sale.incentiveStatus !== 'approved') {
        sale.incentiveStatus = 'pending_approval';
        sale.incentiveRejectedAt = null;
        sale.incentiveRejectedBy = null;
        sale.incentiveRejectionNote = '';
    }

    return sale;
};
