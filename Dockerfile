FROM amazonlinux:2023.2.20230920.1
ARG BUILDPLATFORM TARGETPLATFORM TARGETOS TARGETARCH

# Install nodejs
RUN yum install nodejs npm git wget unzip -y && yum clean all

# Install awscli
RUN if [ "$TARGETARCH" = "arm64" ]; then \
  wget -O awscli.zip https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip ; \
  elif [ "$TARGETARCH" = "amd64" ]; then \
  wget -O awscli.zip https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip ; \
  else \
  echo "Unsupported architecture ($TARGETARCH)" && exit 1; \
  fi; \
  unzip -qq awscli.zip \
  && ./aws/install

# Setup path
ENV PATH /workspace/poduptime/node_modules/.bin:$PATH

# Switch work directory
RUN  mkdir -p /workspace/poduptime \
  /workspace/poduptime/analytics \
  /workspace/poduptime/monitor \
  /workspace/poduptime/website
WORKDIR /workspace/poduptime

# Install the serverless framework
RUN npm install -g serverless@^3.35.2

# Install deps
COPY analytics/package*.json analytics
RUN cd analytics && npm install --production=false --loglevel=error
COPY monitor/package*.json monitor
RUN cd monitor && npm install --production=false --loglevel=error
COPY website/package*.json website
RUN cd website && npm install --production=false --loglevel=error

COPY conf           conf
COPY analytics      analytics
COPY monitor        monitor
COPY website        website
COPY conf_test.js   .*
COPY package*.json  ./