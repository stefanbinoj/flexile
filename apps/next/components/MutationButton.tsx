import { type UseMutationResult } from "@tanstack/react-query";
import React from "react";
import { Button, type ButtonProps } from "@/components/Button";
import { e } from "@/utils";

type MutationConfigProps<T> = {
  mutation: UseMutationResult<unknown, unknown, T>;
  loadingText?: React.ReactNode;
  successText?: React.ReactNode;
  errorText?: React.ReactNode;
  idleVariant?: ButtonProps["variant"];
} & (T extends void ? { param?: T } : { param: T }); // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- this is valid

type MutationButtonProps<T> = MutationConfigProps<T> &
  Omit<ButtonProps, "variant" | "disabled" | "onClick" | "children" | "tw" | "small"> & {
    children: React.ReactNode;
    disabled?: boolean;
  };

const MutationButton = <T extends unknown>({
  mutation,
  loadingText,
  successText,
  errorText,
  idleVariant,
  param,
  children,
  disabled: initialDisabled = false,
  asChild,
  ...restButtonProps
}: MutationButtonProps<T>) => {
  const success = mutation.isSuccess && successText;
  const error = mutation.isError && errorText;

  const calculatedDisabled = mutation.isPending || !!success || !!error || initialDisabled;
  const calculatedVariant = success ? "success" : error ? "critical" : idleVariant;

  return (
    <Button
      disabled={calculatedDisabled}
      variant={calculatedVariant}
      {...restButtonProps}
      asChild={!!asChild}
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- TS isn't smart enough for this
      onClick={e(() => mutation.mutate(param as T), "prevent")}
    >
      {mutation.isPending ? loadingText || children : success || error || children}
    </Button>
  );
};

export default MutationButton;
