import type { MonitoringOverview, ServiceStatus } from '@peppermill/shared';

import { repositories } from '../repositories/index.js';
import { NotFoundError } from '../utils/errors.js';
import { toIso } from '../utils/dates.js';

/** Worst-first, so overall status reflects the most serious problem present. */
const STATUS_SEVERITY: Record<ServiceStatus, number> = {
  outage: 3,
  degraded: 2,
  maintenance: 1,
  operational: 0,
};

export const monitoringService = {
  async overview(tenantId: string): Promise<MonitoringOverview> {
    const data = await repositories.monitoring.getByTenant(tenantId);
    if (!data) throw new NotFoundError('Monitoring data');

    // A single degraded integration must not be reported as a green platform.
    const overallStatus = data.integrations.reduce<ServiceStatus>((worst, integration) => {
      return STATUS_SEVERITY[integration.status] > STATUS_SEVERITY[worst] ? integration.status : worst;
    }, 'operational');

    return {
      overallStatus,
      generatedAt: toIso(new Date()),
      integrations: data.integrations,
      syncJobs: data.syncJobs,
      incidents: data.incidents,
      apiUsage: data.apiUsage,
      uptimeSeries: data.uptimeSeries,
    };
  },
};
