#!/bin/bash
set -e
gitlab-rails runner 'ApplicationSetting.last.update_attributes(signup_enabled: false)'

# TODO gen self signed cert

echo "Post Reconfigure Script successfully executed"
