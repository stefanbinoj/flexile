# frozen_string_literal: true

class DocumentPresenter
  delegate :id, :name, :created_at, :completed_at, :live_attachment, :user, :consulting_contract?, :equity_plan_contract?,
           :share_certificate?, :tax_document?, :exercise_notice?, :company_administrator, :company_worker,
           :contractor_signature, :administrator_signature, :docuseal_submission_id, private: true, to: :document

  def initialize(document)
    @document = document
    @company = document.company
  end

  def props(is_company_administrator:)
    result = {
      id:,
      type: document_type,
      name:,
      created_at: created_at.iso8601,
      completed_at: completed_at&.iso8601,
      status:,
      download_url: live_attachment.present? ? Rails.application.routes.url_helpers.rails_blob_path(live_attachment, disposition: "attachment") : nil,
      signatures:,
    }

    if is_company_administrator
      result[:user_name] = user.name
    end

    result
  end

  private
    attr_reader :document, :company

    def company_info
      {
        name: company.name,
        address: AddressPresenter.new(company).props,
        equity_compensation_enabled: company.equity_compensation_enabled?,
      }
    end

    def signer
      user = company_worker.user
      {
        name: user.legal_name,
        email: user.display_email,
        role: company_worker.company_role.name,
        pay_rate_in_subunits: company_worker.pay_rate_in_subunits,
        pay_rate_type: company_worker.pay_rate_type,
        hours_per_week: company_worker.hours_per_week,
        started_at: (created_at || company_worker.started_at).iso8601, # Fallback to contractor's start date when the document isn't persisted in the DB yet while downloading a draft PDF
        citizenship_country: ISO3166::Country[user.citizenship_country_code]&.common_name,
        billing_entity_name: user.billing_entity_name,
        address: AddressPresenter.new(user).props,
        signature: contractor_signature || user.legal_name,
        equity_percentage: company.equity_compensation_enabled? ? equity_percentage_from_allocation_or_application : 0,
      }
    end

    def signee
      user = company_administrator.user
      {
        signature: administrator_signature || user.legal_name,
        display_email: user.display_email,
      }
    end

    def status
      if document.share_certificate? || document.exercise_notice?
        "Issued"
      elsif document.consulting_contract? || document.equity_plan_contract?
        document.completed_at ? "Signed" : "Signature required"
      elsif document.tax_document?
        if document.completed_at?
          "Submitted"
        else
          "Initialized"
        end
      else
        raise "Unknown document type: #{document.document_type}"
      end
    end

    def document_type
      if consulting_contract? || equity_plan_contract?
        "agreement"
      elsif share_certificate?
        "certificate"
      elsif tax_document?
        "tax_form"
      elsif exercise_notice?
        "exercise_notice"
      else
        raise "Unknown document type: #{document.document_type}"
      end
    end

    def equity_percentage_from_allocation_or_application
      allocation_percentage = company_worker.equity_allocations.find_by(year: Date.today.year)&.equity_percentage
      return allocation_percentage if allocation_percentage.present?

      accepted_application = company_worker.company_role
                                           .company_role_applications
                                           .accepted
                                           .find_by(email: company_worker.user.email)

      accepted_application&.equity_percent
    end
end
