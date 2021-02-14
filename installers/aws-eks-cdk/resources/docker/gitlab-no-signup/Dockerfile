FROM gitlab/gitlab-ce:latest
ARG CONFIG_DIR="/etc/gitlab"
ENV GITLAB_POST_RECONFIGURE_SCRIPT="bash ${CONFIG_DIR}/config.sh"

COPY config.sh ${CONFIG_DIR}/

# Generate self signed certificate
COPY gen_cert.sh ${CONFIG_DIR}/
RUN chmod +x ${CONFIG_DIR}/gen_cert.sh
RUN ${CONFIG_DIR}/gen_cert.sh