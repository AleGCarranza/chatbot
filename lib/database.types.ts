
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "clientes": {
                  Row: {
                    "created_at": string | null,"id": string,"nombre_confirmado": string | null,"nombre_whatsapp": string,"numero_cliente_sicar": string | null,"rfc": string | null,"telefono": string,"updated_at": string | null
                  }
                  Insert: {
                    "created_at"?: string | null,"id"?: string,"nombre_confirmado"?: string | null,"nombre_whatsapp"?: string,"numero_cliente_sicar"?: string | null,"rfc"?: string | null,"telefono": string,"updated_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"nombre_confirmado"?: string | null,"nombre_whatsapp"?: string,"numero_cliente_sicar"?: string | null,"rfc"?: string | null,"telefono"?: string,"updated_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"configuracion_sistema": {
                  Row: {
                    "clave": string,"descripcion": string | null,"updated_at": string | null,"valor_boolean": boolean | null,"valor_texto": string | null
                  }
                  Insert: {
                    "clave": string,"descripcion"?: string | null,"updated_at"?: string | null,"valor_boolean"?: boolean | null,"valor_texto"?: string | null
                  }
                  Update: {
                    "clave"?: string,"descripcion"?: string | null,"updated_at"?: string | null,"valor_boolean"?: boolean | null,"valor_texto"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"perfiles": {
                  Row: {
                    "created_at": string | null,"id": string,"nombre": string | null,"rol": Database["public"]['Enums']["rol_usuario_enum"],"updated_at": string | null
                  }
                  Insert: {
                    "created_at"?: string | null,"id": string,"nombre"?: string | null,"rol"?: Database["public"]['Enums']["rol_usuario_enum"],"updated_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"nombre"?: string | null,"rol"?: Database["public"]['Enums']["rol_usuario_enum"],"updated_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"sesiones_conversacion": {
                  Row: {
                    "cliente_id": string,"created_at": string | null,"datos_json": NonNullable<Json>,"id": string,"paso": string,"updated_at": string | null
                  }
                  Insert: {
                    "cliente_id": string,"created_at"?: string | null,"datos_json"?: NonNullable<Json>,"id"?: string,"paso"?: string,"updated_at"?: string | null
                  }
                  Update: {
                    "cliente_id"?: string,"created_at"?: string | null,"datos_json"?: NonNullable<Json>,"id"?: string,"paso"?: string,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "sesiones_conversacion_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    }
                  ]
                },"tickets_atencion": {
                  Row: {
                    "atendido_por_terminal": string | null,"atendido_por_usuario": string | null,"cliente_id": string,"comprobante_url": string | null,"created_at": string | null,"detalles_json": NonNullable<Json>,"es_nocturno": boolean | null,"estado": Database["public"]['Enums']["estado_ticket_enum"],"folio": number,"id": string,"metodo_pago": Database["public"]['Enums']["metodo_pago_enum"] | null,"pago_confirmado": boolean | null,"tipo_flujo": Database["public"]['Enums']["tipo_flujo_enum"],"updated_at": string | null
                  }
                  Insert: {
                    "atendido_por_terminal"?: string | null,"atendido_por_usuario"?: string | null,"cliente_id": string,"comprobante_url"?: string | null,"created_at"?: string | null,"detalles_json"?: NonNullable<Json>,"es_nocturno"?: boolean | null,"estado"?: Database["public"]['Enums']["estado_ticket_enum"],"folio"?: number,"id"?: string,"metodo_pago"?: Database["public"]['Enums']["metodo_pago_enum"] | null,"pago_confirmado"?: boolean | null,"tipo_flujo": Database["public"]['Enums']["tipo_flujo_enum"],"updated_at"?: string | null
                  }
                  Update: {
                    "atendido_por_terminal"?: string | null,"atendido_por_usuario"?: string | null,"cliente_id"?: string,"comprobante_url"?: string | null,"created_at"?: string | null,"detalles_json"?: NonNullable<Json>,"es_nocturno"?: boolean | null,"estado"?: Database["public"]['Enums']["estado_ticket_enum"],"folio"?: number,"id"?: string,"metodo_pago"?: Database["public"]['Enums']["metodo_pago_enum"] | null,"pago_confirmado"?: boolean | null,"tipo_flujo"?: Database["public"]['Enums']["tipo_flujo_enum"],"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tickets_atencion_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "es_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"es_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"rol_actual":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["rol_usuario_enum"]
                           }
          }
          Enums: {
            "estado_ticket_enum": "pendiente_presencial"|"pendiente_validacion_pago"|"pagado_imprimir"|"en_proceso"|"completado"|"cancelado"|"fuera_horario_incompleto","metodo_pago_enum": "efectivo_caja"|"codi"|"transferencia"|"tarjeta_caja","rol_usuario_enum": "empleado"|"admin","tipo_flujo_enum": "impresion_estandar"|"impresion_express"|"cotizacion"|"facturacion"|"tramite"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "estado_ticket_enum": ["pendiente_presencial", "pendiente_validacion_pago", "pagado_imprimir", "en_proceso", "completado", "cancelado", "fuera_horario_incompleto"],"metodo_pago_enum": ["efectivo_caja", "codi", "transferencia", "tarjeta_caja"],"rol_usuario_enum": ["empleado", "admin"],"tipo_flujo_enum": ["impresion_estandar", "impresion_express", "cotizacion", "facturacion", "tramite"]
          }
        }
} as const
