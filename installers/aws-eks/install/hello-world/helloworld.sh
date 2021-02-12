#!/bin/bash
  
pwd=`readlink -f $(dirname $0)`

. $pwd/manage.sh


deploy_hello_world()
{
	kubectl apply -f $pwd/hello-world/
}

get_hello_world()
{
        kubectl get all -n hello-world
}

test_hello_world()
{
        elb_dns_name=`aws elbv2 describe-load-balancers | jq -r .LoadBalancers[0].DNSName`
        local test_url="http://"$elb_dns_name"/foo"
        echo -e "Testing Hello World Url $test_url \n"
        curl $test_url
}

$*
