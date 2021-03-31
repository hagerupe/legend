import logging as log
import cfnresponse
import boto3
import hashlib

log.getLogger().setLevel(log.INFO)

def main(event, context):

  fqn = event['StackId'] + event['LogicalResourceId']
  physical_id = hashlib.md5(fqn.encode('utf-8')).hexdigest()
  log.info(physical_id)

  try:
    log.info('Input event: %s', event)

    eksCluster = event['Cluster']
    stack = event['ClusterStack']

    attributes = {
      'Response': 'Success'
    }

    cfnresponse.send(event, context, cfnresponse.SUCCESS, attributes, physical_id)
  except Exception as e:
    log.exception(e)
    # cfnresponse's error message is always "see CloudWatch"
    cfnresponse.send(event, context, cfnresponse.FAILED, {}, physical_id)