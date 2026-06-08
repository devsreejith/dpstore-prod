import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function enableNGenius({ container }: ExecArgs) {
  const regionService = container.resolve(Modules.REGION);
  const paymentService = container.resolve(Modules.PAYMENT);
  const logger = container.resolve("logger") || console;

  logger.info("[Setup] Fetching all registered payment providers...");
  const providers = await paymentService.listPaymentProviders({}, { select: ["id"] });
  logger.info(`[Setup] Registered payment providers in Medusa container: ${JSON.stringify(providers)}`);

  logger.info("[Setup] Fetching all configured regions...");
  const regions = await regionService.listRegions({}, { select: ["id", "name"] });
  logger.info(`[Setup] Found regions: ${JSON.stringify(regions)}`);

  const registeredIds = providers.map((p: any) => p.id);

  // Link N-Genius provider to all regions
  for (const region of regions) {
    logger.info(`[Setup] Processing region "${region.name}" (${region.id})...`);
    
    const candidateIds = ["pp_system_default", "pp_ngenius_ngenius", "pp_ngenius", "ngenius"];
    const toAdd = candidateIds.filter(id => registeredIds.includes(id));
    
    logger.info(`[Setup] Linking providers: ${JSON.stringify(toAdd)} to region: ${region.name}`);
    await regionService.updateRegions(region.id, {
      payment_providers: toAdd
    } as any);
  }

  logger.info("[Setup] Regions updated successfully!");
}
