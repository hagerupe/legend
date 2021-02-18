def main(event, context):
  import logging as log
  import boto3
  import hashlib

  log.getLogger().setLevel(log.INFO)

  import os

  import subprocess

  log.info(subprocess.check_output(["curl.sh"]))