# frozen_string_literal: true

FactoryBot.define do
  factory :document do
    company
    user
    year { Date.current.year }
    attachments { [Rack::Test::UploadedFile.new(Rails.root.join("spec/fixtures/files/sample.pdf"))] }

    # Consulting contract
    name { Contract::CONSULTING_CONTRACT_NAME }
    document_type { Document.document_types[:consulting_contract] }
    company_administrator { create(:company_administrator, company:) }
    company_worker { create(:company_worker, company:) }
    administrator_signature { company_administrator.user.legal_name }

    factory :equity_plan_contract_doc do
      name { "Equity Incentive Plan #{Date.current.year}" }
      document_type { Document.document_types[:equity_plan_contract] }
      equity_grant { create(:equity_grant, company_investor: create(:company_investor, company:, user:)) }
    end

    trait :signed do
      contractor_signature { user.legal_name }
      completed_at { Time.current }
    end

    trait :unsigned do
      completed_at { nil }
    end

    factory :tax_doc do
      document_type { Document.document_types[:tax_document] }
      name { TaxDocument::ALL_SUPPORTED_TAX_FORM_NAMES.sample }
      company_administrator { nil }
      company_worker { nil }
      administrator_signature { nil }
      user_compliance_info { create(:user_compliance_info, user:) }

      trait :submitted do
        completed_at { Time.current }
      end

      trait :deleted do
        deleted_at { Time.current }
      end

      trait :form_w9 do
        name { TaxDocument::FORM_W_9 }
      end

      trait :form_w8ben do
        name { TaxDocument::FORM_W_8BEN }
      end

      trait :form_w8bene do
        name { TaxDocument::FORM_W_8BEN_E }
      end

      trait :form_1099div do
        name { TaxDocument::FORM_1099_DIV }
      end

      trait :form_1099nec do
        name { TaxDocument::FORM_1099_NEC }
      end

      trait :form_1042s do
        name { TaxDocument::FORM_1042_S }
      end
    end

    factory :share_certificate_doc do
      document_type { Document.document_types[:share_certificate] }
      name { "Share Certificate" }
      company_administrator { nil }
      company_worker { nil }
      administrator_signature { nil }
    end

    factory :exercise_notice do
      document_type { Document.document_types[:exercise_notice] }
      name { "XA-23 Form of Notice of Exercise (US) 2024.pdf" }
      signed
    end
  end
end
