def main(event, context):
  import logging as log
  import cfnresponse
  import boto3
  import hashlib

  log.getLogger().setLevel(log.INFO)

  fqn = event['StackId'] + event['LogicalResourceId']
  physical_id = hashlib.md5(fqn.encode('utf-8')).hexdigest()
  log.info(physical_id)

  try:
    log.info('Input event: %s', event)

    # TODO call secret manager
    attributes = {
      'Response': '8296daf8-6fb6-11eb-9439-0242ac130002'
    }

    cfnresponse.send(event, context, cfnresponse.SUCCESS, attributes, physical_id)
  except Exception as e:
    log.exception(e)
    # cfnresponse's error message is always "see CloudWatch"
    cfnresponse.send(event, context, cfnresponse.FAILED, {}, physical_id)