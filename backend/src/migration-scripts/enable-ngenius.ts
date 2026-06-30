import { Modules } from "@medusajs/framework/utils";
import { MedusaContainer } from "@medusajs/framework";

export default async function enable_ngenius({ container }: { container: MedusaContainer }) {
  console.log("[Setup] Linking N-Genius provider to regions...");
  
  const regionService = container.resolve(Modules.REGION);
  const paymentService = container.resolve(Modules.PAYMENT);
  const logger = container.resolve("logger") || console;

  // 1. Fetch all registered payment providers
  const providers = await paymentService.listPaymentProviders({}, { select: ["id"] });
  logger.info(`[Setup] Registered payment providers in Medusa container: ${JSON.stringify(providers)}`);

  // 2. Fetch all configured regions
  const regions = await regionService.listRegions({}, { select: ["id", "name"] });
  logger.info(`[Setup] Found regions: ${JSON.stringify(regions)}`);

  const registeredIds = providers.map((p: any) => p.id);

  // 3. For each region, assign the N-Genius payment provider
  for (const region of regions) {
    logger.info(`[Setup] Updating region "${region.name}" (${region.id})...`);
    
    // We support standard Medusa v2 resolved provider formats
    const candidateIds = ["pp_system_default", "pp_ngenius_ngenius", "pp_ngenius", "ngenius"];
    const toAdd = candidateIds.filter(id => registeredIds.includes(id));
    
    logger.info(`[Setup] Linking providers: ${JSON.stringify(toAdd)} to region: ${region.name}`);
    await regionService.updateRegions(region.id, {
      payment_providers: toAdd
    });
  }

  logger.info("[Setup] Regions updated successfully!");
}

