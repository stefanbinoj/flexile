# frozen_string_literal: true

module Company::DigestEmail
  extend ActiveSupport::Concern

  def open_invoices_for_digest_email
    invoices.joins(:company).received.or(invoices.partially_approved)
  end

  def rejected_invoices_not_resubmitted
    invoices
      .includes(:user)
      .select("DISTINCT ON (user_id) *")
      .order("user_id, created_at desc")
      .select { |invoice| invoice.rejected? && contractors.active.exists?(invoice.user_id) }
  end

  def invoices_pending_approval_from(company_administrator)
    invoices, invoice_approvals = Invoice.arel_table, InvoiceApproval.arel_table
    conditions = invoices[:id].eq(invoice_approvals[:invoice_id])
                              .and(invoice_approvals[:approver_id].eq(company_administrator.user_id))

    join = invoices.outer_join(invoice_approvals)
                   .on(conditions)
                   .join_sources

    open_invoices_for_digest_email
      .joins(join)
      .where(invoice_approvals: { id: nil })
  end

  def processing_invoices_for_digest_email
    invoices.joins(:company).processing.or(invoices.approved)
  end
end
