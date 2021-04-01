import logging as log
import cfnresponse
import boto3
import hashlib

log.getLogger().setLevel(log.INFO)

client = boto3.client('elbv2')

def main(event, context):

  fqn = event['StackId'] + event['LogicalResourceId']
  physical_id = hashlib.md5(fqn.encode('utf-8')).hexdigest()
  log.info(physical_id)

  try:
    log.info('Input event: %s', event)

    eksCluster = event['ResourceProperties']['Cluster']
    stack = event['ResourceProperties']['ClusterStack']

    loadBalancers = client.describe_load_balancers()
    for lb in loadBalancers['LoadBalancers']:
      tagDescriptions = client.describe_tags(ResourceArns = [ lb['LoadBalancerArn'] ])
      tags = tagDescriptions['TagDescriptions'][0]['Tags']
      stackTag = list(filter(lambda tag: tag['Key'] == 'ingress.k8s.aws/stack', tags))
      clusterTag = list(filter(lambda tag: tag['Key'] == 'elbv2.k8s.aws/cluster', tags))
      if len(stackTag) > 0 and stackTag[0]['Value'] == stack and len(clusterTag) > 0 and clusterTag[0]['Value'] == eksCluster:
        attributes = {
          'loadBalancerDnsName': lb['DNSName'],
          'loadBalancerCanonicalHostedZoneId': lb['CanonicalHostedZoneId'],
        }
        cfnresponse.send(event, context, cfnresponse.SUCCESS, attributes, physical_id)
        return None
    cfnresponse.send(event, context, cfnresponse.FAILED, {}, physical_id)
  except Exception as e:
    log.exception(e)
    # cfnresponse's error message is always "see CloudWatch"
    cfnresponse.send(event, context, cfnresponse.FAILED, {}, physical_id)