import Dealer from '../models/Dealer.js';
import Distributor from '../models/Distributor.js';
import WalletTransaction from '../models/WalletTransaction.js';

const entityModels = {
    dealer: Dealer,
    distributor: Distributor,
};

export const getEntityModel = (entityType) => entityModels[entityType] || null;

export const applyWalletTransaction = async ({
    entityType,
    entityId,
    type,
    source,
    amount,
    saleId = null,
    notes = '',
    performedBy = null,
}) => {
    const Model = getEntityModel(entityType);

    if (!Model) {
        throw new Error('Invalid wallet entity type');
    }

    const numericAmount = Number(amount) || 0;

    if (numericAmount < 0) {
        throw new Error('Wallet transaction amount must be positive');
    }

    const transaction = await WalletTransaction.create({
        entityType,
        entityId,
        type,
        source,
        amount: numericAmount,
        saleId,
        notes,
        performedBy,
    });

    const balanceDelta = type === 'credit' ? numericAmount : -numericAmount;
    const updatedEntity = await Model.findByIdAndUpdate(
        entityId,
        { $inc: { walletBalance: balanceDelta } },
        { new: true }
    );

    if (!updatedEntity) {
        throw new Error('Wallet owner not found');
    }

    return { transaction, updatedEntity };
};
