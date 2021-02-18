def main(event, context):
  import logging as log
  import boto3
  import hashlib
  import os
  import json
  import subprocess

  log.getLogger().setLevel(log.INFO)
  client = boto3.client('secretsmanager')

  gitlab_host="https://gitlab.sky-hagere.io"
  secret_id = "GitlabRootPassword100B7897-w2dXte30COa9"

  gitlab_password = client.get_secret_value(SecretId=secret_id)['SecretString']
  application_json = subprocess.check_output(["./curl.sh", gitlab_host, gitlab_password]).decode("utf-8")
  application = json.loads(application_json)
  application_id = application['application_id']
  secret = application['secret']