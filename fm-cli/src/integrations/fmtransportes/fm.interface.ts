// Interfaces para API FM Transportes

export interface FMOrderRequest {
  clientDocument: string;
  service: number;
  name: string;
  document: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: number;
  zipCode: number;
  volumes: number;
  email?: string;
  phone?: string;
  nature?: string;
  weight?: number;
  totalValue: number;
  productValue?: number;
  fiscalDocument: number;
  orderNumber: string;
  declarationNumber: string;
  declarationSerie: number;
  declarationDate: string;
  observation?: string;
}

export interface FMOrderResponse {
  orderNumber: string;
  trackingCode: string;
  volumeIds: string[];
}

export interface FMApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface EnvioResultado {
  pedidoId: string;
  pedidoNumero: string;
  trackingCode: string | null;
  volumeIds: string[];
  sucesso: boolean;
  erro?: string;
}

// Mapeamento UF para codigo numerico FM Transportes
export const ESTADO_MAP: Record<string, number> = {
  AC: 1,
  AL: 2,
  AP: 3,
  AM: 4,
  BA: 5,
  CE: 6,
  DF: 7,
  ES: 8,
  GO: 9,
  MA: 10,
  MT: 11,
  MS: 12,
  MG: 13,
  PA: 14,
  PB: 15,
  PR: 16,
  PE: 17,
  PI: 18,
  RJ: 19,
  RN: 20,
  RS: 21,
  RO: 22,
  RR: 23,
  SC: 24,
  SP: 26,
  SE: 25,
  TO: 27,
};
