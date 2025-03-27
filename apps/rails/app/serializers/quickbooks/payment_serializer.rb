# frozen_string_literal: true

class Quickbooks::PaymentSerializer < BaseSerializer
  delegate :integration_external_id, :sync_token, to: :object
  delegate :user, :company, to: :invoice

  def attributes
    company_worker = user.company_workers.find_by(company:)

    result = {
      Line: [
        {
          Amount: invoice.cash_amount_in_usd,
          LinkedTxn: [
            TxnId: invoice.integration_external_id,
            TxnType: "Bill",
          ],
        }
      ],
      TotalAmt: invoice.cash_amount_in_usd,
      PayType: "Check",
      CheckPayment: {
        BankAccountRef: {
          value: company.quickbooks_integration.flexile_clearance_bank_account_id,
        },
      },
      VendorRef: {
        value: company_worker.integration_external_id,
      },
    }
    result[:Id] = integration_external_id if integration_external_id.present?
    result[:SyncToken] = sync_token if sync_token.present?
    result
  end

  private
    def invoice
      @invoice ||= object.invoice
    end
end
