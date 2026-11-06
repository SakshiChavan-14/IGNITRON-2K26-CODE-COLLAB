# MySQL Database Setup for IGNITRON 2K26

This directory provides infrastructure configuration for the MySQL development database.

## Option A: Docker Compose (Recommended if Docker Desktop is installed)

From this directory or root:

```bash
docker compose -f infrastructure/mysql/docker-compose.yml up -d
```

This starts MySQL 8.0 on port 3306 with:
- Database: `ignitron_2k26`
- User: `ignitron_user`
- Password: `ignitron_pass`
- Root Password: `rootpassword`

Connection string for `.env`:
```env
DATABASE_URL="mysql://ignitron_user:ignitron_pass@localhost:3306/ignitron_2k26"
```

To stop the container:
```bash
docker compose -f infrastructure/mysql/docker-compose.yml down
```

---

## Option B: Local Windows MySQL Server (Native)

If MySQL 8.0 is installed natively on Windows (e.g., via MySQL Installer in `C:\Program Files\MySQL\MySQL Server 8.0`):

1. Open **MySQL Command Line Client** or **MySQL Workbench**.
2. Connect as `root` using your local root password.
3. Execute the following SQL commands to create the database and user:

```sql
CREATE DATABASE IF NOT EXISTS ignitron_2k26 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'ignitron_user'@'localhost' IDENTIFIED BY 'ignitron_pass';
GRANT ALL PRIVILEGES ON ignitron_2k26.* TO 'ignitron_user'@'localhost';
FLUSH PRIVILEGES;
```

Alternatively, you can connect directly as `root` in `.env`:
```env
DATABASE_URL="mysql://root:YOUR_ROOT_PASSWORD@localhost:3306/ignitron_2k26"
```

