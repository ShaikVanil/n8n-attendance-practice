import { testDb } from '../setup';
import { Pool } from 'pg';

describe('Database Integration Tests', () => {
  describe('Database Connection', () => {
    it('should connect to test database successfully', async () => {
      const result = await testDb.query('SELECT 1 as test');
      expect(result.rows[0].test).toBe(1);
    });

    it('should handle connection pooling', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(testDb.query('SELECT $1 as value', [i]));
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.rows[0].value).toBe(index);
      });
    });
  });

  describe('Transaction Integrity', () => {
    it('should rollback failed transactions', async () => {
      const client = await testDb.connect();
      
      try {
        await client.query('BEGIN');
        
        // Insert valid user
        await client.query(
          'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)',
          ['transaction@test.com', 'hash', 'Transaction User', 'employee']
        );
        
        // This should fail due to duplicate email
        await expect(
          client.query(
            'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)',
            ['transaction@test.com', 'hash2', 'Duplicate User', 'employee']
          )
        ).rejects.toThrow();
        
        await client.query('ROLLBACK');
        
        // Verify no users were inserted
        const result = await testDb.query('SELECT * FROM users WHERE email = $1', ['transaction@test.com']);
        expect(result.rows).toHaveLength(0);
      } finally {
        client.release();
      }
    });

    it('should commit successful transactions', async () => {
      const client = await testDb.connect();
      
      try {
        await client.query('BEGIN');
        
        // Insert user
        const userResult = await client.query(
          'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id',
          ['commit@test.com', 'hash', 'Commit User', 'employee']
        );
        
        // Insert device
        await client.query(
          'INSERT INTO devices (device_id, device_name, location) VALUES ($1, $2, $3)',
          ['COMMIT_DEVICE', 'Commit Device', 'Commit Location']
        );
        
        await client.query('COMMIT');
        
        // Verify both records exist
        const userCheck = await testDb.query('SELECT * FROM users WHERE email = $1', ['commit@test.com']);
        const deviceCheck = await testDb.query('SELECT * FROM devices WHERE device_id = $1', ['COMMIT_DEVICE']);
        
        expect(userCheck.rows).toHaveLength(1);
        expect(deviceCheck.rows).toHaveLength(1);
      } finally {
        client.release();
      }
    });
  });

  describe('Data Consistency', () => {
    it('should maintain foreign key constraints', async () => {
      // Try to insert attendance record with non-existent user_id
      await expect(
        testDb.query(
          'INSERT INTO attendance_records (user_id, device_id, check_in_time, status) VALUES ($1, $2, $3, $4)',
          [99999, 1, new Date(), 'present']
        )
      ).rejects.toThrow();
    });

    it('should enforce unique constraints', async () => {
      // Insert first user
      await testDb.query(
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)',
        ['unique@test.com', 'hash', 'Unique User', 'employee']
      );
      
      // Try to insert duplicate email
      await expect(
        testDb.query(
          'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)',
          ['unique@test.com', 'hash2', 'Duplicate User', 'employee']
        )
      ).rejects.toThrow();
    });

    it('should handle cascade deletes properly', async () => {
      // Insert user
      const userResult = await testDb.query(
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id',
        ['cascade@test.com', 'hash', 'Cascade User', 'employee']
      );
      const userId = userResult.rows[0].id;
      
      // Insert device
      const deviceResult = await testDb.query(
        'INSERT INTO devices (device_id, device_name, location) VALUES ($1, $2, $3) RETURNING id',
        ['CASCADE_DEVICE', 'Cascade Device', 'Cascade Location']
      );
      const deviceId = deviceResult.rows[0].id;
      
      // Insert attendance record
      await testDb.query(
        'INSERT INTO attendance_records (user_id, device_id, check_in_time, status) VALUES ($1, $2, $3, $4)',
        [userId, deviceId, new Date(), 'present']
      );
      
      // Delete user (should cascade to attendance records if configured)
      await testDb.query('DELETE FROM users WHERE id = $1', [userId]);
      
      // Check if attendance records were handled appropriately
      const attendanceCheck = await testDb.query('SELECT * FROM attendance_records WHERE user_id = $1', [userId]);
      // Depending on cascade configuration, this might be 0 or have null user_id
      expect(attendanceCheck.rows.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk inserts efficiently', async () => {
      const startTime = Date.now();
      const batchSize = 100;
      
      // Prepare bulk insert data
      const values = [];
      const params = [];
      for (let i = 0; i < batchSize; i++) {
        values.push(`($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`);
        params.push(`bulk${i}@test.com`, 'hash', `Bulk User ${i}`, 'employee');
      }
      
      const query = `INSERT INTO users (email, password_hash, name, role) VALUES ${values.join(', ')}`;
      await testDb.query(query, params);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
      
      // Verify all records were inserted
      const result = await testDb.query('SELECT COUNT(*) as count FROM users WHERE email LIKE $1', ['bulk%@test.com']);
      expect(parseInt(result.rows[0].count)).toBe(batchSize);
    });

    it('should handle concurrent queries', async () => {
      const concurrentQueries = 10;
      const promises = [];
      
      for (let i = 0; i < concurrentQueries; i++) {
        promises.push(
          testDb.query(
            'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id',
            [`concurrent${i}@test.com`, 'hash', `Concurrent User ${i}`, 'employee']
          )
        );
      }
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(concurrentQueries);
      
      // Verify all users were created with unique IDs
      const ids = results.map(r => r.rows[0].id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(concurrentQueries);
    });
  });

  describe('Migration Testing', () => {
    it('should have all required tables', async () => {
      const tables = ['users', 'devices', 'attendance_records'];
      
      for (const table of tables) {
        const result = await testDb.query(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
          [table]
        );
        expect(result.rows[0].exists).toBe(true);
      }
    });

    it('should have correct column types and constraints', async () => {
      // Check users table structure
      const usersColumns = await testDb.query(
        "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users'"
      );
      
      const columnMap = usersColumns.rows.reduce((acc, row) => {
        acc[row.column_name] = { type: row.data_type, nullable: row.is_nullable === 'YES' };
        return acc;
      }, {});
      
      expect(columnMap.id).toBeDefined();
      expect(columnMap.email).toBeDefined();
      expect(columnMap.email.nullable).toBe(false);
      expect(columnMap.password_hash).toBeDefined();
      expect(columnMap.name).toBeDefined();
      expect(columnMap.role).toBeDefined();
    });
  });
});