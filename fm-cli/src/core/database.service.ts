import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;

  async onModuleInit() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'sql.sdebot.top',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'sde_admin',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'fretes_sde',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    try {
      const client = await this.pool.connect();
      this.logger.log('Conexao com banco de dados estabelecida');
      client.release();
    } catch (error: any) {
      this.logger.error(`Erro ao conectar ao banco: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('Pool de conexoes encerrado');
  }

  /**
   * Executa uma query no banco
   */
  async query<T>(sql: string, params?: any[]): Promise<T> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows as T;
    } finally {
      client.release();
    }
  }

  /**
   * Executa uma query e retorna uma unica linha
   */
  async queryOne<T>(sql: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T[]>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Verifica saude da conexao
   */
  async verificarConexao(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtem um client para transacoes
   */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }
}
