import { CommissionTier } from '@/types';

export const tierNames = ['第一档', '第二档', '第三档', '第四档', '第五档', '第六档', '第七档', '第八档', '第九档', '第十档'];

export function getTierName(tierOrder: number) {
  return tierNames[tierOrder - 1] || `第${tierOrder}档`;
}

export interface TierFormData {
  minAmount: number;
  maxAmount: number;
  rate: number;
  tierOrder: number;
  isActive: boolean;
}

export interface TierHistoryRecord {
  id: string;
  version: string;
  timestamp: Date;
  description: string;
  tiers: CommissionTier[];
}

export const tierHistoryData: TierHistoryRecord[] = [
  {
    id: 'history-001',
    version: 'v1.0',
    timestamp: new Date('2026-06-01'),
    description: '初始版本，建立基础阶梯抽成体系',
    tiers: [
      { id: 'tier-001', minAmount: 0, maxAmount: 100000, rate: 10, tierOrder: 1, isActive: true },
      { id: 'tier-002', minAmount: 100000, maxAmount: 300000, rate: 15, tierOrder: 2, isActive: true },
      { id: 'tier-003', minAmount: 300000, maxAmount: 500000, rate: 20, tierOrder: 3, isActive: true },
      { id: 'tier-004', minAmount: 500000, maxAmount: 999999999, rate: 25, tierOrder: 4, isActive: true },
    ],
  },
  {
    id: 'history-002',
    version: 'v1.1',
    timestamp: new Date('2026-06-10'),
    description: '调整高档位抽成比例，提升高业绩激励',
    tiers: [
      { id: 'tier-001', minAmount: 0, maxAmount: 100000, rate: 10, tierOrder: 1, isActive: true },
      { id: 'tier-002', minAmount: 100000, maxAmount: 300000, rate: 15, tierOrder: 2, isActive: true },
      { id: 'tier-003', minAmount: 300000, maxAmount: 500000, rate: 20, tierOrder: 3, isActive: true },
      { id: 'tier-004', minAmount: 500000, maxAmount: 999999999, rate: 25, tierOrder: 4, isActive: true },
    ],
  },
];
