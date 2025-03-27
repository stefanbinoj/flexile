# frozen_string_literal: true

configuration_by_env = {
  production: {
    protocol: "https",
    root_domain: "flexile.com",
    domain: "app.flexile.com",
    api_domain: "api.flexile.com",
    email_domain: "flexile.com",
  },
  staging: {
    protocol: "https",
    root_domain: "demo.flexile.com",
    domain: "demo.flexile.com",
    api_domain: "api.demo.flexile.com",
    email_domain: "demo.flexile.com",
  },
  test: {
    protocol: "https",
    root_domain: "test.flexile.dev",
    domain: "test.flexile.dev",
    api_domain: "api.test.flexile.dev",
    email_domain: "test.flexile.dev",
  },
  development: {
    protocol: "https",
    root_domain: "flexile.dev",
    domain: "flexile.dev",
    api_domain: "api.flexile.dev",
    email_domain: "flexile.dev",
  },
}

config = configuration_by_env[Rails.env.to_sym]

if Rails.env.development? && ENV["LOCAL_PROXY_DOMAIN"].present?
  ROOT_DOMAIN = ENV["LOCAL_PROXY_DOMAIN"]
  DOMAIN = ENV["LOCAL_PROXY_DOMAIN"]
  API_DOMAIN = ENV["LOCAL_PROXY_DOMAIN"]
  EMAIL_DOMAIN = configuration_by_env[:development][:email_domain]
else
  ROOT_DOMAIN = config[:root_domain]
  DOMAIN = config[:domain]
  API_DOMAIN = config[:api_domain]
  EMAIL_DOMAIN = config[:email_domain]
end

PROTOCOL = config[:protocol]
