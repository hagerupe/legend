import logging as log
import boto3
import hashlib
import os
import json
import subprocess
import logging as log
import cfnresponse
import boto3
import hashlib

log.getLogger().setLevel(log.INFO)
secretsmanager = boto3.client('secretsmanager')

def main(event, context):

  fqn = event['StackId'] + event['LogicalResourceId']
  physical_id = hashlib.md5(fqn.encode('utf-8')).hexdigest()
  log.info(physical_id)

  try:
    log.info('Input event: %s', event)

    gitlab_host= event['ResourceProperties']['host']
    secret_id = event['ResourceProperties']['secret']

    gitlab_password = secretsmanager.get_secret_value(SecretId=secret_id)['SecretString']
    application_json = subprocess.check_output(["./curl.sh", gitlab_host, gitlab_password]).decode("utf-8")
    application = json.loads(application_json)
    application_id = application['application_id']
    secret = application['secret']

    attributes = {
      'applicationId': application_id,
      'secret': secret,
    }

    cfnresponse.send(event, context, cfnresponse.SUCCESS, attributes, physical_id)
  except Exception as e:
    log.exception(e)
    # cfnresponse's error message is always "see CloudWatch"
    cfnresponse.send(event, context, cfnresponse.FAILED, {}, physical_id)