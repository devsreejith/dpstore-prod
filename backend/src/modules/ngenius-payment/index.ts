import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import { NGeniusPaymentService } from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [NGeniusPaymentService],
});
