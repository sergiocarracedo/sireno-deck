import {
  GenericSystemStatusDefaults,
  GenericSystemStatusSchema,
} from "./schemas"
import GenericSystemStatusFrontend from "./frontend"

export const genericButtonRegistration = {
  schemas: [GenericSystemStatusSchema],
  defaultConfig: GenericSystemStatusDefaults,
  frontend: GenericSystemStatusFrontend,
}

export { GenericSystemStatusSchema } from "./schemas"
export type { GenericSystemStatusConfig } from "./schemas"