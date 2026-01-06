# Essential Linux Commands for AWS Deployment

A comprehensive reference of Linux commands needed for deploying and managing applications on AWS EC2 instances.

## Table of Contents
1. [System Management](#system-management)
2. [File Operations](#file-operations)
3. [Process Management](#process-management)
4. [Network & Troubleshooting](#network--troubleshooting)
5. [User & Permissions](#user--permissions)
6. [Package Management](#package-management)
7. [Systemd Service Management](#systemd-service-management)
8. [Log Viewing & Analysis](#log-viewing--analysis)
9. [Disk & Storage](#disk--storage)
10. [Security & Firewall](#security--firewall)

---

## System Management

### System Information
```bash
# Check OS version
cat /etc/os-release
lsb_release -a

# Check kernel version
uname -r
uname -a

# Check system uptime
uptime

# Check system resources
free -h          # Memory usage
df -h            # Disk usage
top              # Real-time process monitoring
htop             # Better top (install: sudo apt install htop)

# Check CPU info
lscpu
cat /proc/cpuinfo

# Check hostname
hostname
hostnamectl
```

### System Updates
```bash
# Update package list
sudo apt update

# Upgrade packages
sudo apt upgrade -y

# Full system upgrade
sudo apt full-upgrade -y

# Remove unused packages
sudo apt autoremove -y

# Clean package cache
sudo apt clean
```

### System Control
```bash
# Reboot system
sudo reboot

# Shutdown system
sudo shutdown -h now
sudo poweroff

# Schedule reboot
sudo shutdown -r +10  # Reboot in 10 minutes
sudo shutdown -r 22:00  # Reboot at 10 PM

# Cancel scheduled shutdown
sudo shutdown -c
```

---

## File Operations

### Navigation
```bash
# Print working directory
pwd

# List files
ls                    # Basic list
ls -la                # Detailed list with hidden files
ls -lh                # Human-readable file sizes
ls -lt                # Sort by modification time
ls -lS                # Sort by file size

# Change directory
cd /var/www          # Absolute path
cd ../               # Parent directory
cd ~                 # Home directory
cd -                 # Previous directory
```

### File Manipulation
```bash
# Create file
touch filename.txt
echo "content" > file.txt

# Create directory
mkdir mydir
mkdir -p /path/to/nested/dir  # Create parent directories

# Copy files
cp source.txt dest.txt
cp -r /source/dir /dest/dir   # Copy directory recursively
cp -p file.txt backup.txt     # Preserve permissions

# Move/Rename
mv oldname.txt newname.txt
mv file.txt /new/location/

# Delete files
rm file.txt
rm -r directory/              # Delete directory recursively
rm -rf directory/             # Force delete without confirmation

# Delete empty directory
rmdir emptydir/
```

### File Viewing
```bash
# View entire file
cat file.txt

# View with line numbers
cat -n file.txt

# View first 10 lines
head file.txt
head -n 20 file.txt  # First 20 lines

# View last 10 lines
tail file.txt
tail -n 50 file.txt  # Last 50 lines

# Follow file in real-time (logs)
tail -f /var/log/nginx/access.log

# View file with pagination
less file.txt
more file.txt

# Search in file
grep "search term" file.txt
grep -i "case insensitive" file.txt
grep -r "recursive search" /directory/
grep -n "with line numbers" file.txt
```

### File Editing
```bash
# Edit with nano (beginner-friendly)
nano file.txt
# Ctrl+O to save, Ctrl+X to exit

# Edit with vim
vim file.txt
# Press 'i' for insert mode
# Press 'Esc' then ':wq' to save and exit
# Press 'Esc' then ':q!' to exit without saving

# Quick edit with sed
sed -i 's/old/new/g' file.txt  # Replace all occurrences
```

### File Permissions
```bash
# View permissions
ls -l file.txt

# Change permissions (numeric)
chmod 644 file.txt   # rw-r--r--
chmod 755 file.txt   # rwxr-xr-x
chmod 600 file.txt   # rw-------

# Change permissions (symbolic)
chmod u+x file.txt   # Add execute for user
chmod g-w file.txt   # Remove write for group
chmod o+r file.txt   # Add read for others

# Change ownership
chown user:group file.txt
chown -R user:group /directory/

# Change group only
chgrp groupname file.txt
```

### File Compression
```bash
# Create tar archive
tar -czf archive.tar.gz /path/to/directory/
tar -czf backup.tar.gz file1.txt file2.txt

# Extract tar archive
tar -xzf archive.tar.gz
tar -xzf archive.tar.gz -C /destination/

# List contents of tar
tar -tzf archive.tar.gz

# Create zip archive
zip -r archive.zip /path/to/directory/

# Extract zip
unzip archive.zip
unzip archive.zip -d /destination/
```

---

## Process Management

### View Processes
```bash
# List all processes
ps aux
ps -ef

# Process tree
pstree

# Find process by name
ps aux | grep nginx
pgrep nginx

# Real-time monitoring
top
htop  # Better interface

# Process by user
ps -u username
```

### Kill Processes
```bash
# Kill by PID
kill 1234
kill -9 1234  # Force kill

# Kill by name
pkill nginx
killall nginx

# Kill all processes by user
pkill -u username
```

### Background Processes
```bash
# Run in background
command &

# List background jobs
jobs

# Bring to foreground
fg %1

# Send to background
bg %1

# Detach from terminal
nohup command &
```

---

## Network & Troubleshooting

### Network Information
```bash
# Check IP address
ip addr show
ip a
ifconfig  # Older command

# Check network interfaces
ip link show

# Check routing table
ip route show
route -n

# Check DNS
cat /etc/resolv.conf
```

### Network Testing
```bash
# Ping host
ping google.com
ping -c 4 google.com  # Send 4 packets

# Test port connectivity
telnet hostname 80
nc -zv hostname 80    # Netcat

# Trace route
traceroute google.com
mtr google.com        # Better traceroute

# DNS lookup
nslookup google.com
dig google.com
host google.com

# Check open ports
sudo netstat -tulpn
sudo ss -tulpn        # Modern alternative
sudo lsof -i :80      # Check specific port
```

### Download Files
```bash
# Download with wget
wget https://example.com/file.zip
wget -O custom-name.zip https://example.com/file.zip

# Download with curl
curl -O https://example.com/file.zip
curl -o custom-name.zip https://example.com/file.zip

# Resume download
wget -c https://example.com/large-file.zip
```

### Firewall
```bash
# Check firewall status
sudo ufw status

# Enable firewall
sudo ufw enable

# Allow port
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22/tcp

# Allow service
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH

# Deny port
sudo ufw deny 3306

# Delete rule
sudo ufw delete allow 80

# Disable firewall
sudo ufw disable
```

---

## User & Permissions

### User Management
```bash
# Add user
sudo adduser username
sudo useradd -m -s /bin/bash username

# Delete user
sudo deluser username
sudo userdel -r username  # Remove home directory

# Change password
sudo passwd username
passwd  # Change own password

# Switch user
su - username
sudo -u username command

# Add user to group
sudo usermod -aG groupname username
sudo usermod -aG sudo username  # Add to sudo group

# List groups
groups
groups username

# Create group
sudo groupadd groupname
```

### Sudo Access
```bash
# Run command as root
sudo command

# Open root shell
sudo -i
sudo su

# Edit sudoers file
sudo visudo

# Run command as another user
sudo -u username command
```

---

## Package Management

### APT (Ubuntu/Debian)
```bash
# Update package list
sudo apt update

# Install package
sudo apt install package-name
sudo apt install -y package-name  # Auto-yes

# Remove package
sudo apt remove package-name
sudo apt purge package-name  # Remove with config files

# Search for package
apt search package-name
apt-cache search package-name

# Show package info
apt show package-name

# List installed packages
apt list --installed
dpkg -l

# Check if package is installed
dpkg -l | grep package-name
```

### Snap Packages
```bash
# Install snap package
sudo snap install package-name

# List installed snaps
snap list

# Update snap
sudo snap refresh package-name

# Remove snap
sudo snap remove package-name
```

---

## Systemd Service Management

### Service Control
```bash
# Start service
sudo systemctl start nginx

# Stop service
sudo systemctl stop nginx

# Restart service
sudo systemctl restart nginx

# Reload configuration
sudo systemctl reload nginx

# Enable service (start on boot)
sudo systemctl enable nginx

# Disable service
sudo systemctl disable nginx

# Check service status
sudo systemctl status nginx
systemctl is-active nginx
systemctl is-enabled nginx

# List all services
systemctl list-units --type=service
systemctl list-units --type=service --state=running
```

### Service Logs
```bash
# View service logs
sudo journalctl -u nginx

# Follow logs in real-time
sudo journalctl -u nginx -f

# View last 100 lines
sudo journalctl -u nginx -n 100

# View logs since boot
sudo journalctl -u nginx -b

# View logs for specific time
sudo journalctl -u nginx --since "2024-01-01" --until "2024-01-02"
sudo journalctl -u nginx --since "1 hour ago"
```

### Create Custom Service
```bash
# Create service file
sudo nano /etc/systemd/system/myapp.service

# Reload systemd
sudo systemctl daemon-reload

# Start and enable service
sudo systemctl start myapp
sudo systemctl enable myapp
```

---

## Log Viewing & Analysis

### System Logs
```bash
# View system log
sudo tail -f /var/log/syslog

# View authentication log
sudo tail -f /var/log/auth.log

# View kernel log
dmesg
dmesg | tail

# View boot log
sudo journalctl -b
```

### Application Logs
```bash
# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Apache logs
sudo tail -f /var/log/apache2/access.log
sudo tail -f /var/log/apache2/error.log

# PM2 logs
pm2 logs
pm2 logs app-name

# Application logs
tail -f /var/www/myapp/logs/app.log
```

### Log Analysis
```bash
# Search in logs
grep "error" /var/log/nginx/error.log
grep -i "404" /var/log/nginx/access.log

# Count occurrences
grep -c "error" /var/log/nginx/error.log

# Show unique IPs
awk '{print $1}' /var/log/nginx/access.log | sort | uniq

# Count requests per IP
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr

# Show 404 errors
grep " 404 " /var/log/nginx/access.log
```

---

## Disk & Storage

### Disk Usage
```bash
# Check disk space
df -h
df -h /var/www

# Check directory size
du -sh /var/www/
du -sh *  # Size of all items in current directory
du -h --max-depth=1 /var/www/

# Find large files
find / -type f -size +100M 2>/dev/null
find /var -type f -size +100M -exec ls -lh {} \;

# Find large directories
du -h /var | sort -rh | head -20
```

### Disk Operations
```bash
# List block devices
lsblk

# Mount disk
sudo mount /dev/sdb1 /mnt/mydisk

# Unmount disk
sudo umount /mnt/mydisk

# Check disk for errors
sudo fsck /dev/sdb1

# Format disk
sudo mkfs.ext4 /dev/sdb1
```

---

## Security & Firewall

### SSH Configuration
```bash
# Generate SSH key
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# Copy SSH key to server
ssh-copy-id user@hostname

# SSH config file
nano ~/.ssh/config

# Example SSH config:
# Host myserver
#   HostName 54.123.45.67
#   User ubuntu
#   IdentityFile ~/.ssh/my-key.pem
```

### File Integrity
```bash
# Calculate MD5 checksum
md5sum file.txt

# Calculate SHA256 checksum
sha256sum file.txt

# Verify checksum
echo "checksum_value  file.txt" | sha256sum -c
```

### Security Scanning
```bash
# Check for rootkits
sudo apt install rkhunter
sudo rkhunter --check

# Check for malware
sudo apt install clamav
sudo clamscan -r /home

# Check open ports
sudo netstat -tulpn
sudo ss -tulpn
```

---

## Useful One-Liners

```bash
# Find and delete files older than 30 days
find /var/log -type f -mtime +30 -delete

# Find files modified in last 24 hours
find /var/www -type f -mtime -1

# Replace text in multiple files
find . -type f -name "*.txt" -exec sed -i 's/old/new/g' {} +

# Count files in directory
ls -1 | wc -l

# Show directory tree
tree -L 2  # 2 levels deep

# Monitor file changes
watch -n 1 'ls -lh file.txt'

# Show listening ports
sudo lsof -i -P -n | grep LISTEN

# Kill all processes by name
pkill -9 -f "process_name"

# Create backup with timestamp
tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz /var/www/

# Find broken symbolic links
find -L /path -type l

# Show most used commands
history | awk '{print $2}' | sort | uniq -c | sort -rn | head -10
```

---

## Environment Variables

```bash
# View all environment variables
env
printenv

# View specific variable
echo $PATH
echo $HOME

# Set temporary variable
export MY_VAR="value"

# Set permanent variable (add to ~/.bashrc)
echo 'export MY_VAR="value"' >> ~/.bashrc
source ~/.bashrc

# Unset variable
unset MY_VAR
```

---

## Cron Jobs

```bash
# Edit crontab
crontab -e

# List cron jobs
crontab -l

# Remove all cron jobs
crontab -r

# Cron syntax:
# * * * * * command
# │ │ │ │ │
# │ │ │ │ └─ Day of week (0-7, 0 and 7 are Sunday)
# │ │ │ └─── Month (1-12)
# │ │ └───── Day of month (1-31)
# │ └─────── Hour (0-23)
# └───────── Minute (0-59)

# Examples:
# Run every minute
# * * * * * /path/to/script.sh

# Run every day at 2 AM
# 0 2 * * * /path/to/backup.sh

# Run every Monday at 3 PM
# 0 15 * * 1 /path/to/script.sh
```

---

## Quick Reference Card

### Most Used Commands
```bash
# Navigation
cd, ls, pwd

# File operations
cp, mv, rm, mkdir, touch

# File viewing
cat, less, tail, head, grep

# Permissions
chmod, chown

# Process management
ps, top, kill, pkill

# System
sudo, systemctl, apt

# Network
ping, curl, wget, netstat

# Logs
tail -f, journalctl
```

---

This reference covers the essential Linux commands you'll need for deploying and managing applications on AWS EC2 instances. Keep this handy for quick lookups!
