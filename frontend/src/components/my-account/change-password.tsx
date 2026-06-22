import PasswordInput from "@components/ui/password-input";
import Button from "@components/ui/button";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { fadeInTop } from "@utils/motion/fade-in-top";
import {
	useChangePasswordMutation,
	ChangePasswordInputType,
} from "@framework/customer/use-change-password";
import { useTranslation } from "next-i18next";
import { useState } from "react";
import Alert from "@components/ui/alert";

const defaultValues = {
	oldPassword: "",
	newPassword: "",
	confirmNewPassword: "",
};

const ChangePassword: React.FC = () => {
	const { mutate: changePassword, isPending } = useChangePasswordMutation();
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		watch,
		formState: { errors },
	} = useForm<ChangePasswordInputType>({
		defaultValues,
	});
	function onSubmit(input: ChangePasswordInputType) {
		setSuccessMessage(null);
		setErrorMessage(null);
		changePassword(input, {
			onSuccess: (res: any) => {
				const mode = res?.mode;
				if (mode === "updated") {
					setSuccessMessage("Password updated.");
				} else {
					setSuccessMessage("Password reset instructions sent to your email.");
				}
			},
			onError: (err: any) => {
				setErrorMessage(String(err?.message ?? "Failed to change password"));
			},
		});
	}
	const { t } = useTranslation();
	const newPassword = watch("newPassword");
	return (
		<>
			<h2 className="text-xl md:text-2xl font-bold text-[#005844] mb-6 font-body">
				{t("common:text-change-password")}
			</h2>
			<motion.div
				layout
				initial="from"
				animate="to"
				exit="from"
				//@ts-ignore
				variants={fadeInTop(0.35)}
				className={`w-full flex h-full lg:w-8/12 flex-col`}
			>
				<form
					onSubmit={handleSubmit(onSubmit)}
					className="w-full mx-auto flex flex-col justify-center "
					noValidate
				>
					<div className="flex flex-col space-y-3">
						{errorMessage ? <Alert message={errorMessage} /> : null}
						{successMessage ? (
							<div className="h-full py-4 px-5 text-sm text-green-700 font-semibold flex items-center justify-center border border-green-200 rounded">
								{successMessage}
							</div>
						) : null}
						<PasswordInput
							labelKey="forms:label-old-password"
							errorKey={errors.oldPassword?.message}
							{...register("oldPassword", {
								required: "forms:password-old-required",
							})}
							className="mb-4"
						/>
						<PasswordInput
							labelKey="forms:label-new-password"
							errorKey={errors.newPassword?.message}
							{...register("newPassword", {
								required: "forms:label-new-password",
							})}
							className="mb-4"
						/>
						<PasswordInput
							labelKey="forms:label-confirm-password"
							errorKey={errors.confirmNewPassword?.message}
							{...register("confirmNewPassword", {
								required: "forms:password-confirm-required",
								validate: (v) => v === newPassword || "forms:password-did-not-match",
							})}
							className="mb-4"
						/>

						<div className="relative">
							<Button
								type="submit"
								loading={isPending}
								disabled={isPending}
								className="h-11 px-6 bg-[#005844] hover:bg-[#008755] text-white font-semibold font-body rounded transition duration-150 mt-3 w-full sm:w-auto"
							>
								{t("common:text-change-password")}
							</Button>
						</div>
					</div>
				</form>
			</motion.div>
		</>
	);
};

export default ChangePassword;
