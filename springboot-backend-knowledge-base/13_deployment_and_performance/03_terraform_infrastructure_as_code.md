# Terraform (Infrastructure as Code)

## 1. Why Terraform?

Clicking buttons in AWS Console is a sin.
Terraform allows you to define your **entire** infrastructure (VPC, RDS, EKS, S3) in code.
Version controlled. Reproducible.

---

## 2. The Provider (AWS)

`main.tf`:
```hcl
provider "aws" {
  region = "us-east-1"
}

terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}
```

---

## 3. Provisioning RDS (Postgres)

```hcl
resource "aws_db_instance" "default" {
  allocated_storage    = 20
  storage_type         = "gp2"
  engine               = "postgres"
  engine_version       = "14.1"
  instance_class       = "db.t3.micro"
  db_name              = "mydb"
  username             = "admin"
  password             = var.db_password
  parameter_group_name = "default.postgres14"
  skip_final_snapshot  = true
}
```

---

## 4. Provisioning EKS (Kubernetes)

Use the official module (don't write from scratch).

```hcl
module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  cluster_name    = "my-cluster"
  cluster_version = "1.27"
  subnet_ids      = module.vpc.private_subnets
  vpc_id          = module.vpc.vpc_id

  eks_managed_node_groups = {
    green = {
      min_size     = 1
      max_size     = 3
      desired_size = 2
      instance_types = ["t3.medium"]
    }
  }
}
```

---

## 5. The Workflow

1.  `terraform init`: Download plugins.
2.  `terraform plan`: "I will create 5 resources and destroy 0". (Review this!)
3.  `terraform apply`: Execute.

**Best Practice**: Run `plan` in Pull Request. Run `apply` on Merge.
