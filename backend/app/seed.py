"""Seed script to populate database with sample data."""
import asyncio
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models.application import AppStatus, Application
from app.models.backup import Backup, BackupFrequency, BackupStatus
from app.models.provider import Provider
from app.models.server import Server, ServerStatus
from app.models.server_ssh_key import ServerSshKey
from app.models.ssh_connection import SshConnection
from app.models.ssh_key import SshKey, SshKeyType


async def seed():
    async with async_session() as db:
        # Providers
        hetzner = Provider(name="Hetzner", website="https://www.hetzner.com", support_contact="support@hetzner.com", notes="Main EU provider")
        digitalocean = Provider(name="DigitalOcean", website="https://www.digitalocean.com", support_contact="support@digitalocean.com", notes="US/EU droplets")
        contabo = Provider(name="Contabo", website="https://contabo.com", support_contact="support@contabo.com", notes="Budget VPS")
        db.add_all([hetzner, digitalocean, contabo])
        await db.flush()

        # Servers
        web1 = Server(name="web-prod-01", provider_id=hetzner.id, hostname="web-prod-01.example.com",
                       ip_v4="10.0.1.10", os="Ubuntu 24.04", cpu_cores=4, ram_mb=8192, disk_gb=80,
                       location="Nuremberg, DE", datacenter="FSN1-DC14", status=ServerStatus.active,
                       monthly_cost=Decimal("12.99"), cost_currency="EUR", login_user="root")
        web2 = Server(name="web-prod-02", provider_id=hetzner.id, hostname="web-prod-02.example.com",
                       ip_v4="10.0.1.11", os="Ubuntu 24.04", cpu_cores=4, ram_mb=8192, disk_gb=80,
                       location="Falkenstein, DE", datacenter="FSN1-DC14", status=ServerStatus.active,
                       monthly_cost=Decimal("12.99"), cost_currency="EUR", login_user="root")
        db_server = Server(name="db-prod-01", provider_id=hetzner.id, hostname="db-prod-01.example.com",
                            ip_v4="10.0.2.10", os="Debian 12", cpu_cores=8, ram_mb=32768, disk_gb=500,
                            location="Nuremberg, DE", datacenter="FSN1-DC14", status=ServerStatus.active,
                            monthly_cost=Decimal("39.99"), cost_currency="EUR", login_user="root")
        staging = Server(name="staging-01", provider_id=digitalocean.id, hostname="staging.example.com",
                          ip_v4="10.0.3.10", os="Ubuntu 24.04", cpu_cores=2, ram_mb=4096, disk_gb=80,
                          location="Amsterdam, NL", datacenter="AMS3", status=ServerStatus.active,
                          monthly_cost=Decimal("24.00"), cost_currency="USD", login_user="deploy")
        backup_srv = Server(name="backup-01", provider_id=contabo.id, hostname="backup-01.example.com",
                             ip_v4="10.0.4.10", os="Debian 12", cpu_cores=4, ram_mb=8192, disk_gb=1000,
                             location="Nuremberg, DE", status=ServerStatus.active,
                             monthly_cost=Decimal("8.99"), cost_currency="EUR", login_user="root",
                             notes="Large disk for backups")
        legacy = Server(name="legacy-app-01", provider_id=digitalocean.id, hostname="legacy.example.com",
                         ip_v4="10.0.5.10", os="Ubuntu 20.04", cpu_cores=1, ram_mb=2048, disk_gb=50,
                         location="New York, US", datacenter="NYC1", status=ServerStatus.maintenance,
                         monthly_cost=Decimal("12.00"), cost_currency="USD", login_user="admin",
                         notes="Scheduled for decommission Q2 2026")
        db.add_all([web1, web2, db_server, staging, backup_srv, legacy])
        await db.flush()

        # SSH Keys
        deploy_key = SshKey(name="deploy-key", key_type=SshKeyType.ed25519,
                             fingerprint="SHA256:abc123def456", comment="CI/CD deploy key")
        admin_key = SshKey(name="admin-key", key_type=SshKeyType.ed25519,
                            fingerprint="SHA256:xyz789uvw012", comment="Admin access")
        backup_key = SshKey(name="backup-key", key_type=SshKeyType.rsa,
                             fingerprint="SHA256:bak456key789", comment="Backup automation")
        db.add_all([deploy_key, admin_key, backup_key])
        await db.flush()

        # Server SSH Key associations
        associations = [
            ServerSshKey(server_id=web1.id, ssh_key_id=deploy_key.id, is_authorized=True),
            ServerSshKey(server_id=web1.id, ssh_key_id=admin_key.id, is_authorized=True),
            ServerSshKey(server_id=web2.id, ssh_key_id=deploy_key.id, is_authorized=True),
            ServerSshKey(server_id=web2.id, ssh_key_id=admin_key.id, is_authorized=True),
            ServerSshKey(server_id=db_server.id, ssh_key_id=admin_key.id, is_authorized=True),
            ServerSshKey(server_id=staging.id, ssh_key_id=deploy_key.id, is_authorized=True),
            ServerSshKey(server_id=staging.id, ssh_key_id=admin_key.id, is_authorized=True),
            ServerSshKey(server_id=backup_srv.id, ssh_key_id=backup_key.id, is_authorized=True),
            ServerSshKey(server_id=backup_srv.id, ssh_key_id=admin_key.id, is_authorized=True),
        ]
        db.add_all(associations)
        await db.flush()

        # SSH Connections
        connections = [
            SshConnection(source_server_id=web1.id, target_server_id=db_server.id,
                          ssh_key_id=deploy_key.id, ssh_user="app", ssh_port=22, purpose="Database access"),
            SshConnection(source_server_id=web2.id, target_server_id=db_server.id,
                          ssh_key_id=deploy_key.id, ssh_user="app", ssh_port=22, purpose="Database access"),
            SshConnection(source_server_id=web1.id, target_server_id=backup_srv.id,
                          ssh_key_id=backup_key.id, ssh_user="backup", ssh_port=22, purpose="Nightly backup push"),
            SshConnection(source_server_id=db_server.id, target_server_id=backup_srv.id,
                          ssh_key_id=backup_key.id, ssh_user="backup", ssh_port=22, purpose="DB dump transfer"),
            SshConnection(source_server_id=staging.id, target_server_id=db_server.id,
                          ssh_key_id=deploy_key.id, ssh_user="app", ssh_port=22, purpose="Staging DB sync"),
        ]
        db.add_all(connections)
        await db.flush()

        # Applications
        apps = [
            Application(name="Main Website", server_id=web1.id, app_type="Next.js", port=3000,
                        status=AppStatus.running, url="https://example.com", notes="Production frontend"),
            Application(name="API Backend", server_id=web1.id, app_type="FastAPI", port=8000,
                        status=AppStatus.running, url="https://api.example.com"),
            Application(name="Main Website (replica)", server_id=web2.id, app_type="Next.js", port=3000,
                        status=AppStatus.running, url="https://example.com"),
            Application(name="PostgreSQL", server_id=db_server.id, app_type="Database", port=5432,
                        status=AppStatus.running),
            Application(name="Redis", server_id=db_server.id, app_type="Cache", port=6379,
                        status=AppStatus.running),
            Application(name="Staging App", server_id=staging.id, app_type="Next.js", port=3000,
                        status=AppStatus.running, url="https://staging.example.com"),
            Application(name="Legacy CRM", server_id=legacy.id, app_type="PHP", port=80,
                        status=AppStatus.stopped, notes="Being migrated"),
            Application(name="Monitoring Agent", server_id=backup_srv.id, app_type="Prometheus Node Exporter",
                        port=9100, status=AppStatus.running),
        ]
        db.add_all(apps)
        await db.flush()

        # Backups
        now = datetime.utcnow()
        backups = [
            Backup(name="Web1 full backup", source_server_id=web1.id, target_server_id=backup_srv.id,
                   application_id=apps[0].id, frequency=BackupFrequency.daily, retention_days=30,
                   storage_path="/backups/web1/", last_run_at=now - timedelta(hours=6),
                   last_run_status=BackupStatus.success),
            Backup(name="DB daily dump", source_server_id=db_server.id, target_server_id=backup_srv.id,
                   application_id=apps[3].id, frequency=BackupFrequency.daily, retention_days=14,
                   storage_path="/backups/db/daily/", last_run_at=now - timedelta(hours=3),
                   last_run_status=BackupStatus.success),
            Backup(name="DB weekly archive", source_server_id=db_server.id, target_server_id=backup_srv.id,
                   application_id=apps[3].id, frequency=BackupFrequency.weekly, retention_days=90,
                   storage_path="/backups/db/weekly/", last_run_at=now - timedelta(days=2),
                   last_run_status=BackupStatus.success),
            Backup(name="Staging snapshot", source_server_id=staging.id,
                   frequency=BackupFrequency.weekly, retention_days=7,
                   storage_path="/backups/staging/", last_run_at=now - timedelta(days=1),
                   last_run_status=BackupStatus.failed, notes="Disk space issue"),
            Backup(name="Legacy CRM export", source_server_id=legacy.id, target_server_id=backup_srv.id,
                   application_id=apps[6].id, frequency=BackupFrequency.manual,
                   storage_path="/backups/legacy/", last_run_status=BackupStatus.never_run,
                   notes="Manual export before decommission"),
        ]
        db.add_all(backups)
        await db.commit()
        print("Seed data created successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
